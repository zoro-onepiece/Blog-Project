import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import { config } from "dotenv";
config();
// console.log("Loaded env:", process.env);
import { marked } from "marked";
import { v4 as uuidv4 } from "uuid";
import methodOverride from "method-override"; // Import method-override
const app = express();
const port = 3006;
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(methodOverride("_method"));
const postImages = ["/images/girl_read.png", "/images/boy_read.png"];

let posts = [
  {
    id: uuidv4(),
    title: "Featured post",
    content: "This is a wider card...",
    date: "Nov 12",
  },
  {
    id: uuidv4(),
    title: "Post title",
    content: "This is another wider card...",
    date: "Nov 11",
  },
];
app.get("/", (req, res) => {
  res.render("index.ejs", { posts: posts });
});

app.get("/new", (req, res) => {
  res.render("new.ejs", (err, html) => {
    if (err) {
      console.error("Error rendering EJS:", err);
      return res.status(500).send("Error rendering page");
    }
    res.send(html);
  });
});

app.post("/posts", (req, res) => {
  const { title, content } = req.body;

  // Add new post to beginning of array
  posts.unshift({
    id: uuidv4(),
    title,
    content,
    date: new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    image: postImages[Math.floor(Math.random() * postImages.length)],
  });

  // Redirect to home page to see all posts
  res.redirect("/");
});

app.get("/post/:id", (req, res) => {
  const postId = req.params.id;
  const post = posts.find((p) => p.id === postId);
  if (!post) {
    return res.status(404).send("Post not found");
  }
  res.render("show.ejs", { post: post });
});

app.get("/edit/:id", (req, res) => {
  const postId = req.params.id;
  const post = posts.find((p) => p.id === postId);
  if (!post) {
    return res.status(404).send("Post not found");
  }
  res.render("edit.ejs", { post: post }); // Render the edit.ejs template
});

// PUT route to handle updating a post
app.put("/posts/:id", (req, res) => {
  const postId = req.params.id;
  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).send("Title and content are required for update.");
  }

  const postIndex = posts.findIndex((p) => p.id === postId);

  if (postIndex === -1) {
    return res.status(404).send("Post not found.");
  }

  // Update the existing post
  posts[postIndex].title = title;
  posts[postIndex].content = content;
  // Date and image usually not updated via edit form, but you could add inputs for them
  posts[postIndex].date = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  }); // Update date to today

  res.redirect(`/post/${postId}`); // Redirect to the updated post's page
});

// DELETE route to handle deleting a post
app.delete("/posts/:id", (req, res) => {
  const postId = req.params.id;
  const initialLength = posts.length;
  posts = posts.filter((p) => p.id !== postId); // Filter out the post to be deleted

  if (posts.length === initialLength) {
    // If length hasn't changed, post wasn't found
    return res.status(404).send("Post not found for deletion.");
  }

  res.redirect("/"); // Redirect to the home page after deletion
});

// Chat endpoint using Axios
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "deepseek/deepseek-chat", // Specify DeepSeek model via OpenRouter
        messages: [
          {
            role: "system",
            content: `You are Dev Door AI, a helpful assistant for the Dev Door blogging website. The website has the following functionalities:
- **Home**: Displays a list of blog posts with titles, dates, and content snippets.
- **About Us**: Provides information about Dev Door, a passionate blogging platform for technology and beyond.
- **Posts**: A section to view all blog posts.
- **New Post**: Allows users to create a new blog post by clicking '+ New Post'.
- **View Post**: Shows detailed content of a specific post when clicking 'Continue reading'.
- **Edit Post**: Enables users to edit an existing post.
- **Delete Post**: Allows users to delete a post.
Respond in proper Markdown format, using double newlines (\\n\\n) for paragraphs and single newlines (\\n) for line breaks within paragraphs. Avoid literal \\n in the output.`,
          },
          { role: "user", content: message },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "HTTP-Referer": "http://localhost:3006", // Required by OpenRouter
          "X-Title": "Dev Door Blog", // Optional app name
          "Content-Type": "application/json",
        },
      }
    );

    const reply = response.data.choices[0].message.content;
    res.json(reply);
  } catch (error) {
    console.error("OpenRouter Error:", error.response?.data || error.message);
    res.status(500).json({
      error: "Failed to get response",
      details: error.response?.data?.error || error.message,
    });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
