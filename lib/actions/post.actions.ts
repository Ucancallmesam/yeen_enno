"use server"

import { revalidatePath } from "next/cache";
import Post from "../models/post.model";
import User from "../models/user.model";
import { connectToDB } from "../mongoose";

interface Params {
    text: string,
    author: string,
    communityId: string | null,
    path: string,
}

export async function createPost({ text, author, communityId, path}: Params) {
    try {
        connectToDB();

        const createdPost = await Post.create({
            text,
            author,
            community: null,
        });
    
        //update user model
        await User.findByIdAndUpdate( author, {
            $push: { posts: createdPost._id }
        })
    
        revalidatePath(path);
    } catch (error: any) {
      throw new Error(`Error creating post: ${error.message}`)  
    }
}

export async function fetchPosts(pageNumber = 1, pageSize = 20) {
    connectToDB();

    //Calculate the number of posts to skip
    const skipAmount = (pageNumber - 1) * pageSize;

    // Fetch the posts that have no parents (top-level threads...)
    const postsQuery = Post.find({ parentId: { $in: [null, undefined]}})
        .sort({ createdAt: 'desc'})
        .skip(skipAmount)
        .limit(pageSize)
        .populate({ path: 'author', model: User })
        .populate({
            path: 'children',
            model: User,
            select: '_id name parentId image'
        })

    const totalPostsCount = await Post.countDocuments({ parentId: { $in:
    [null, undefined] }})

    const posts = await postsQuery.exec();

    const isNext = totalPostsCount > skipAmount + posts.length;

    return { posts, isNext}
    
}

export async function fetchPostById(id: string) {
    connectToDB();

    try {

        // TODO: Populate Community
        const post = await Post.findById(id)
            .populate({
                path: 'author',
                model: User,
                select: '_id id name image'
            })
            .populate({
                path: 'children',
                populate: [
                    {
                        path: 'author',
                        model: User,
                        select: '_id id name parentId image'
                    },
                    {
                        path: 'childer',
                        model: Post,
                        populate: {
                            path: 'author',
                            model: User,
                            select: '_id id name parentId image'
                        }
                    }
                ]
            }).exec();

            return post;
    } catch (error: any ) {
        throw new Error(`Error fetching post: ${error.message}`)
    }
}

export async function addCommentToPost(
    postId: string,
    commentText: string,
    userId: string,
    path: string,
)   {
    connectToDB();

    try {
      // Find the original post by its ID
      const originalPost = await Post.findById(postId);

      if(!originalPost) {
        throw new Error('Post not found')
      }
      // Create a new post with the comment text
      const commentPost = new Post({})
    } catch (error: any) {
        throw new Error(`Error adding comment to post: ${error.message}`)
    }
}
    