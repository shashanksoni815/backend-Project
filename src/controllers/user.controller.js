import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

const registerUser = asyncHandler( async (req, res) => {
    // get user details from frontend
    // validations - not empty
    // check if user already exist
    // check for cover images and avtar
    // if it exists upload it to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation and then response

    const {fullName, email, username, password } = req.body
    console.log(email, "Email");
} )

export { registerUser, }