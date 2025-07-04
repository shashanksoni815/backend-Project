import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/Cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
// import { upload } from "../middlewares/multer.middleware.js";
// import { app } from "../app.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async( userId ) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token")
    }
}


const registerUser = asyncHandler( async (req, res) => {
    // get user details from frontend
    // validations - not empty
    // check if user already exist
    // check for cover images and avtar
    // if it exists upload it to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation and then response

//     const { fullName, email, username, password } = req.body;

// const fields = { fullName, email, username, password };

// for (const [key, value] of Object.entries(fields)) {
//   if (typeof value !== "string" || value.trim() === "") {
//     throw new ApiError(400, `${key} is required`);
//   }
// }

// console.log("req.body : ", req.body)


    const {fullName, email, username, password } = req.body
    // console.log(email, "Email");

    console.log("req.body : ", req.body)

    if (!password) {
    throw new ApiError(400, "Password is required");
    }

    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }

    // const avatarFile = req.files?.avatar?.[0];
    // if (!avatarFile) {
    // throw new ApiError(400, "Avatar file is required");
    // }

    // console.log("req.headers = ", req.headers)
    console.log("req.files = ", req.files)

    let avatar;
    try {
    const filePath = req.files.avatar[0].path.replace(/\\/g, "/"); // Normalize for Windows
    console.log("Uploading avatar from:", filePath);
    avatar = await uploadOnCloudinary(filePath);
    console.log("Cloudinary response for avatar:", avatar);
    } catch (error) {
    console.error("Avatar upload failed:", error);
    throw new ApiError(500, "Failed to upload avatar to Cloudinary");
    }


    // const avatarFile = req.files?.avatar?.[0];
    // if (!avatarFile?.path) {
    // throw new ApiError(400, "Avatar file is required");
    // }

    // const avatarPath = avatarFile.path.replace(/\\/g, "/"); // Windows-safe


    // // const avatarLocalPath = req.files?.avatar[0]?.path
    // const coverImageLocalPath = req.files.coverImage[0].path.replace(/\\/g, "/");

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path.replace(/\\/g, "/")
    }

    // if (!avatarPath) {
    //     throw new ApiError(400, "Avatar file is required");
    // }
    // // if (!avatarLocalPath) {
    // //     throw new ApiError(400, "Avatar file is required");
    // // }

    // const avatar =  await uploadOnCloudinary(avatarPath);
    // // const avatar =  await uploadOnCloudinary(avatarLocalPath);
    const coverImage =  await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(400, "Avatar is required");
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "user register successfuly")
    );

} )

const loginUser = asyncHandler(async (req, res) => {
    // req body => data 
    //  username or email
    // find the user
    // password check
    // acces and refresh token
    // send cookies
    // console.log(req.body)
    console.log("Headers:", req.headers);
console.log("Body:", req.body);

    const {email, username, password } = req.body
    
    //const {email, username, password} = req.body
    // console.log("Body keys:", Object.keys(req.body));
    console.log("req.body : ", req.body)
    if(!username && !email) {
        throw new ApiError(400, "username or email is required")
    }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "Password is incorrect")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200, {
                user: loggedInUser, accessToken, refreshToken
            },
            "User Logged in Successfuly"
        )
    )
})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            },
        },
            {
                new: true
            }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request")
    }

   try {
     const decodedToken = jwt.verify(
         incomingRefreshToken,
         process.env.REFRESH_TOKEN_SECRET
     )
 
     const user = await User.findById(decodedToken?._id)
 
     if(!user) {
         throw new ApiError(401, "Invalid refresh Token")
     }
 
     if(incomingRefreshToken !== user?.refreshToken) {
         throw new ApiError(401, "refresh Token is expired or used")
     }
 
     const options = {
         httpOnly: true,
         secure: true
     }
 
     const {accessToken, newRefreshToken} = await generateAccessAndRefreshToken(user._id)
 
     return res.status(200)
     .cookie("accessToken", accessToken, options )
     .cookie("refreshToken", newRefreshToken, options)
     .json(
         new ApiResponse(
             200,
             {accessToken, refreshToken: newRefreshToken },
             "Access token refreshed"
         )
     )
   } catch (error) {
     throw new ApiError(401, error?.message || "Invalid refresh token")
   }
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const {oldPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password change successfully" ))
})

const getCurrentUser = asyncHandler(async(req, res) => {
    return res
    .status(200)
    .json(200, req.user, "current user fetched succefully")
})

const updateAccountDetails = asyncHandler(async(req, res) => {
    const {fullName, email} = req.body

    if(!fullName || !email) {
        throw new ApiError(400, "All fields are required")
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email: email
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"))
})

const updateUserAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url) {
        throw new ApiError(400, "Error while uploading on Avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,

        {
            $set:{
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Avatar upadated successfully")
    )
})

const updateUserCoverImage = asyncHandler(async(req, res) => {
    
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath) {
        throw new ApiError(400, "Cover Image file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url) {
        throw new ApiError(400, "Error while uploading on coverImage")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,

        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "cover image upadated successfully")
    )
})

export { 
    registerUser, 
    loginUser, 
    logoutUser, 
    refreshAccessToken, 
    changeCurrentPassword , 
    getCurrentUser, 
    updateAccountDetails, 
    updateUserAvatar, 
    updateUserCoverImage
}