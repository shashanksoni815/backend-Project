import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/Cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
// import { upload } from "../middlewares/multer.middleware.js";


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
    const coverImageLocalPath = req.files.coverImage[0].path.replace(/\\/g, "/");

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
        coverImage: coverImage.url || "",
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

export { registerUser, }