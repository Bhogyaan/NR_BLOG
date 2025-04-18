import mongoose from "mongoose";

const replySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, required: true },
  userProfilePic: { type: String, default: "" },
  username: { type: String, default: "" },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
  isEdited: { type: Boolean, default: false }
});

const commentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, required: true },
  userProfilePic: { type: String, default: "" },
  username: { type: String, default: "" },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  replies: [replySchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
  isEdited: { type: Boolean, default: false }
});

const postSchema = new mongoose.Schema({
  postedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  text: { type: String, required: true },
  media: { type: String },
  mediaType: {
    type: String,
    enum: ["image", "video", "document", "audio"],
  },
  previewUrl: { type: String, default: null },
  originalFilename: { type: String },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  comments: [commentSchema],
  isEdited: { type: Boolean, default: false },
  gridFsId: { type: mongoose.Schema.Types.ObjectId },
  bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  isBanned: { type: Boolean, default: false },
  bannedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  },
  bannedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true
});

postSchema.virtual('postedByUser', {
  ref: 'User',
  localField: 'postedBy',
  foreignField: '_id',
  justOne: true
});

postSchema.virtual('bannedByUser', {
  ref: 'User',
  localField: 'bannedBy',
  foreignField: '_id',
  justOne: true
});

const Post = mongoose.model("Post", postSchema);

export default Post;