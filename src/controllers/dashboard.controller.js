import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
  // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
  const { userId } = req.params;
  if (!userId || userId.trim() === "") {
    throw new ApiError(400, "User Id is required");
  }

  if (!mongoose.isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid User Id format");
  }

  const videoStats = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "videoLikes",
      },
    },
    {
      $project: {
        views: 1,
        likesCount: { $size: "$videoLikes" },
      },
    },
    {
      $group: {
        _id: null,
        totalVideos: { $sum: 1 },
        totalViews: { $sum: "$views" },
        totalLikes: { $sum: "$likesCount" },
      },
    },
  ]);

  const totalSubscribers = await Subscription.countDocuments({
    channel: new mongoose.Types.ObjectId(userId),
  });

  const stats = {
    totalSubscribers: totalSubscribers,
    totalVideos: videoStats.length > 0 ? videoStats[0].totalVideos : 0,
    totalViews: videoStats.length > 0 ? videoStats[0].totalViews : 0,
    totalLikes: videoStats.length > 0 ? videoStats[0].totalLikes : 0,
  };

  return res
    .status(200)
    .json(new ApiResponse(200, stats, "Channel Stats fetched successfully"));
});

const getChannelVideos = asyncHandler(async (req, res) => {
  // TODO: Get all the videos uploaded by the channel
  const { userId } = req.params;

  if (!userId || userId.trim() === "") {
    throw new ApiError(400, "User ID is required");
  }

  if (!mongoose.isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid User ID format");
  }

  const pipeline = Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $sort: {
        [sortBy]: sortType === "desc" ? -1 : 1,
      },
    },
  ]);

  const options = {
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 10,
  };

  const videos = await Video.aggregatePaginate(pipeline, options);

  if (!videos) {
    throw new ApiError(404, "videos not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Videos fetched successfully"));
});

export { getChannelStats, getChannelVideos };
