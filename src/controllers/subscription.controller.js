import mongoose from "mongoose";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  // TODO: toggle subscription
  if (!channelId) {
    throw new ApiError(400, "Channel Id is required");
  }
  if (!mongoose.isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channel ID format");
  }

  if (channelId === req.user._id.toString()) {
    throw new ApiError(400, "You cannot subscribe to your own channel");
  }

  const channelExists = await User.exists({ _id: channelId });

  if (!channelExists) {
    throw new ApiError(404, "Channel not found");
  }

  const subscribedChannel = await Subscription.findOne({
    channel: channelId,
    subscriber: req.user._id,
  });

  let isSubscribed;

  if (subscribedChannel) {
    await Subscription.findByIdAndDelete(subscribedChannel._id);
    isSubscribed = false;
  } else {
    await Subscription.create({
      channel: channelId,
      subscriber: req.user._id,
    });
    isSubscribed = true;
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, isSubscribed, "Subscription toggle successfully"),
    );
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!channelId) {
    throw new ApiError(400, "Channel Id is required");
  }
  if (!mongoose.isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channel ID format");
  }

  const channelExists = await User.exists({ _id: channelId });

  if (!channelExists) {
    throw new ApiError(404, "Channel not found");
  }

  const subscriberListPipeline = Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscriberDetails",
      },
    },
    {
      $unwind: "$subscriberDetails",
    },

    {
      $project: {
        _id: 1,
        subscriberDetails: {
          username: 1,
          fullName: 1,
          avatar: 1,
        },
      },
    },
  ]);

  const options = {
    page: parseInt(req.query.page, 10) || 1,
    limit: parseInt(req.query.limit, 10) || 10,
  };

  const subscribers = await Subscription.aggregatePaginate(
    subscriberListPipeline,
    options,
  );
  return res
    .status(200)
    .json(
      new ApiResponse(200, subscribers, "User channel fetched successfully"),
    );
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;
  if (!subscriberId) {
    throw new ApiError(400, "subscriber Id is required");
  }
  if (!mongoose.isValidObjectId(subscriberId)) {
    throw new ApiError(400, "Invalid subscriber ID format");
  }

  const subscriberExists = await User.exists({ _id: subscriberId });

  if (!subscriberExists) {
    throw new ApiError(404, "subscriber not found");
  }

  const channelListPipeline = Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(subscriberId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "channelDetails",
      },
    },
    {
      $unwind: "$channelDetails",
    },
    {
      $project: {
        _id: 1,
        channelDetails: {
          username: 1,
          fullName: 1,
          avatar: 1,
        },
      },
    },
  ]);

  const options = {
    page: parseInt(req.query.page, 10) || 1,
    limit: parseInt(req.query.limit, 10) || 10,
  };

  const channels = await Subscription.aggregatePaginate(
    channelListPipeline,
    options,
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        channels,
        "All Subscribed channel fetched successfully",
      ),
    );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
