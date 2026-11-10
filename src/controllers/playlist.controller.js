import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";

const createPlaylist = asyncHandler(async (req, res) => {
  //TODO: create playlist
  const { name, description } = req.body;
  const { videoId } = req.params;

  if (!name || name.trim() === "") {
    throw new ApiError(400, "Name is required");
  }
  if (!description || description.trim() === "") {
    throw new ApiError(400, "description is required");
  }

  const playlistVideos = [];

  if (videoId && videoId.trim() !== "") {
    if (!mongoose.isValidObjectId(videoId))
      throw new ApiError(400, "Invalid Video ID format");

    const isVideoExists = await Video.exists({ _id: videoId });

    if (!isVideoExists) {
      throw new ApiError(404, "Video not found");
    }
    playlistVideos.push(new mongoose.Types.ObjectId(videoId));
  }

  const playlist = await Playlist.create({
    name,
    description,
    videos: playlistVideos,
    owner: req.user._id,
  });

  if (!playlist) {
    throw new ApiError(500, "Something went wrong while creating playlist");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, playlist, "Playlist created successfully"));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  //TODO: get user playlists
  const { userId } = req.params;

  if (!userId) {
    throw new ApiError(400, "User id is required");
  }

  if (!mongoose.isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user ID format");
  }

  const pipeline = [
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        description: 1,
        videos: 1,
        totalVideos: { $size: "$videos" },
        createdAt: 1,
        updatedAt,
      },
    },
  ];

  const playlistAggregate = Playlist.aggregate(pipeline);

  const options = {
    page: parseInt(req.query.page, 10) || 1,
    limit: parseInt(req.query.limit, 10) || 10,
  };

  const playlist = await Playlist.aggregatePaginate(playlistAggregate, options);

  if (!playlist) {
    throw new ApiError(400, "Playlist not fetched");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "User Playlist fetched successfully"));
});

const getPlaylistById = asyncHandler(async (req, res) => {
  //TODO: get playlist by id
  const { playlistId } = req.params;

  if (!playlistId || playlistId.trim() === "") {
    throw new ApiError(400, "Playlist id required");
  }

  if (!mongoose.isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid Playlist ID format");
  }

  const playlist = await Playlist.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(playlistId),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
      },
    },
  ]);

  if (!playlist || playlist.length === 0) {
    throw new ApiError(404, "Playlist not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlist[0], "Playlist fetched successfully"));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  if (!(playlistId && videoId)) {
    throw new ApiError(400, "Playlist and video id is required ");
  }

  if (
    !mongoose.isValidObjectId(playlistId) ||
    !mongoose.isValidObjectId(videoId)
  ) {
    throw new ApiError(400, "Invalid playlist ID video ID format");
  }

  const videoExists = await Video.exists({ _id: videoId });
  if (!videoExists) {
    throw new ApiError(404, "The video you are trying to add does not exist");
  }

  const videoAddToPlaylist = await Playlist.findOneAndUpdate(
    {
      _id: playlistId,
      owner: req.user._id,
    },
    {
      $addToSet: {
        videos: videoId,
      },
    },
    { new: true },
  );
  if (!videoAddToPlaylist) {
    throw new ApiError(
      404,
      "Playlist not found or you do not have permission to modify it ",
    );
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, videoAddToPlaylist, "Video added in the playlist "),
    );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  // TODO: remove video from playlist
  const { playlistId, videoId } = req.params;

  if (!(playlistId && videoId)) {
    throw new ApiError(400, "Playlist and video id is required ");
  }

  if (
    !mongoose.isValidObjectId(playlistId) ||
    !mongoose.isValidObjectId(videoId)
  ) {
    throw new ApiError(400, "Invalid playlist ID video ID format");
  }

  const playlist = await Playlist.findOneAndUpdate(
    {
      _id: playlistId,
      owner: req.user._id,
    },
    {
      $pull: { videos: videoId },
    },
    { new: true },
  );

  if (!playlist) {
    throw new ApiError(
      404,
      "Playlist not found or you can not modify this Playlist",
    );
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        playlist,
        "Video removed from playlist successfully",
      ),
    );
});

const deletePlaylist = asyncHandler(async (req, res) => {
  // TODO: delete playlist
  const { playlistId } = req.params;

  if (!playlistId || playlistId.trim() === "") {
    throw new ApiError(400, "Playlist Id is required");
  }

  if (!mongoose.isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist ID format");
  }

  const deletedPlaylist = await Playlist.findOneAndDelete({
    _id: playlistId,
    owner: req.user._id,
  });

  if (!deletedPlaylist) {
    throw new ApiError(
      404,
      "Playlist not found or you do not have permission to delete it ",
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Playlist deleted successfully"));
});

const updatePlaylist = asyncHandler(async (req, res) => {
  //TODO: update playlist
  const { playlistId } = req.params;
  const { name, description } = req.body;

  if (!playlistId || playlistId.trim() === "") {
    throw new ApiError(400, "Playlist Id is required");
  }

  if (!mongoose.isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist ID format");
  }

  const updateFields = {};

  if (name && name.trim() !== "") {
    updateFields.name = name.trim();
  }

  if (description && description.trim() !== "") {
    updateFields.description = description.trim();
  }

  if (Object.keys(updateFields).length === 0) {
    throw new ApiError(
      400,
      "Please provide at least a valid name or description to update",
    );
  }

  const updatedPlaylist = await Playlist.findOneAndUpdate(
    {
      _id: playlistId,
      owner: req.user._id,
    },
    {
      $set: updateFields,
    },
    { new: true },
  );

  if (!updatedPlaylist) {
    throw new ApiError(
      404,
      "Playlist not found or you can not update this Playlist",
    );
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedPlaylist, "Playlist updated successfully"),
    );
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
