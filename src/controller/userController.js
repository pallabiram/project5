const userModel = require("../model/userModel");
const bcrypt = require('bcryptjs')
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { uploadFile } = require('../utils/awsUpload');
const { isValidString, isEmail, isValidPassword, isValidPhone, isValidPincode, } = require("../Validator/userValidator");

//**************************Create User*******************************/

const postUser = async (req, res) => {
  try {
    let data = req.body;
    let files = req.files;
    //.......destructuring......

    if (Object.keys(data).length == 0)
      return res.status(400).send({ status: false, message: "Please provide some data for registration!!" });

    let { fname, lname, email, phone, password, address } = data;

    let securePassword = await bcrypt.hash(password, 10); //......salt used.....

    if (!fname)
      return res.status(400).send({ status: false, message: "fname is Mandatory!!" });

    if (!lname)
      return res.status(400).send({ status: false, message: "lname is Mandatory!!" });

    //===========================  Email ================================================================
    if (!email)
      return res.status(400).send({ status: false, message: "email is required" });
    if (!isEmail(email))
      return res.status(400).send({ status: false, message: "email is not valid" });
    let UniqueEmail = await userModel.findOne({ email: email });
    if (UniqueEmail)
      return res.status(400).send({ status: false, message: "Email already Exists" });

    //===========================  password ================================================================

    if (!password)
      return res.status(400).send({ status: false, message: "password is required" });
    if (!isValidPassword(password))
      return res.status(400).send({ status: false, message: "The password must contain an uppercase, a lowercase, a numeric value, a special character and the limit is from 8 to 15 characters." });

    //===========================  Phone ================================================================
    if (!phone)
      return res.status(400).send({ status: false, message: "phone number is required" });
    if (!isValidPhone(phone))
      return res.status(400).send({ status: false, message: "phone is not valid" });
    let UniquePhone = await userModel.findOne({ phone: phone });
    if (UniquePhone)
      return res.status(400).send({ status: false, message: "Phone already Exists" });

    if (address) {
      address = JSON.parse(address);

      if (!data.address)
        return res.status(400).send({ status: false, message: "address is required" });
      if (!address.shipping)
        return res.status(400).send({ status: false, message: "Shipping address is required" });
      if (!address.shipping.street)
        return res.status(400).send({ status: false, message: "Shipping street  is required" });
      if (!address.shipping.city)
        return res.status(400).send({ status: false, message: "Shipping city is required" });
      if (!isValidPincode(address.shipping.pincode))
        return res.status(400).send({ status: false, message: "Shipping pincode is not valid" });
      if (!address.billing.street)
        return res.status(400).send({ status: false, message: "Billing Street is required" });
      if (!address.billing.city)
        return res.status(400).send({ status: false, message: "Billing city is required" });
      if (!isValidPincode(address.billing.pincode))
        return res.status(400).send({ status: false, message: "Billing pincode is valid" });
    }
    if ((files && files.length) > 0) {
      let image = files[0]
      let imagename = image.originalname
      if (!/^.*\.(jpg|JPG|gif|GIF|doc|DOC|pdf|PDF|PNG|png|jpeg|JPEG)$/.test(imagename))
        return res.status(400).send({ status: false, message: "file only accept pdf,jpg ,png, doc" })
      //upload to s3 and get the uploaded link
      // res.send the link back to frontend/postman
      var uploadedFileURL = await uploadFile(files[0]);
    } else {
      return res.status(404).send({ status: false, message: "Please provide the profile photo.." });
    }
    let user = {
      fname: fname,
      lname: lname,
      email: email,
      profileImage: uploadedFileURL,
      phone: phone,
      address: address,
      password: securePassword,
    };

    let createUser = await userModel.create(user);
    return res.status(201).send({ status: true, message: "file uploaded succesfully", data: createUser });
  } catch (error) {
    return res.status(500).send({ status: false, message: error.message });
  }
};

//**************************Login User*******************************/

const loginUser = async function (req, res) {
  try {
    const body = req.body;
    if (Object.keys(body).length == 0)
      return res.status(400).send({ status: false, message: "Please fill data in body" });

    const { email, password } = body;

    if (!email)
      return res.status(400).send({ status: false, message: "Email is mandatory" });
    if (!isEmail(email))
      return res.status(400).send({ status: false, message: "Invalid email, ex.- ( abc123@gmail.com )" });

    if (!password)
      return res.status(400).send({ status: false, message: "Please provide the password!!" });

    let checkUser = await userModel.findOne({ email: email });

    if (!checkUser) {
      return res.status(401).send({ status: false, message: "User not found" });
    }

    let checkPassword = await bcrypt.compare(password, checkUser.password);
    if (!checkPassword)
      return res.status(400).send({ status: false, message: "Enter correct Password" });

    let createToken = jwt.sign(
      {
        userId: checkUser._id.toString(),
      },
      "user-secret-key", { expiresIn: "5 hr" }
    );

    return res.status(201).send({ status: true, message: "User login successfull", data: { userId: checkUser._id, token: createToken } });
  } catch (err) {
    return res.status(500).send(err.message);
  }
};

//****************************Get user********************************/

const getUserProfile = async function (req, res) {
  try {
    let userId = req.params.userId;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).send({ status: false, message: "userId is not valid" });
    }

    const user = await userModel.findById({ _id: userId });
    if (!user) {
      return res.status(404).send({ send: false, message: "No profile available with this userId" });
    }
    return res.status(200).send({ status: true, message: "User profile details", data: user });

  } catch (error) {
    return res.status(500).send({ status: false, message: error.message });
  }
};

//**************************Update user******************************/

const updateUser = async (req, res) => {
  let data = req.body;
  let files = req.files;
  let userId = req.params.userId;

  let { fname, lname, email, phone, password, address } = data;
  // console.log(address)

  if (Object.keys(data).length == 0)
    return res.status(400).send({ status: false, message: "Please provide some data for updating the profile!!" });

  if (fname) {
    if (!isValidString(fname)) {
      return res.status(400).send({ status: false, message: "fname should be valid" });
    }
  }

  if (lname) {
    if (!isValidString(lname)) {
      return res.status(400).send({ status: false, message: "lname is not valid" });
    }
  }


  // //===========================  Email ================================================================
  if (email) {
    if (!isEmail(email)) return res.status(400).send({ status: false, message: "Email is invalid!!" })
  }
  let UniqueEmail = await userModel.findOne({ email: email });
  if (UniqueEmail)
    return res.status(400).send({ status: false, message: "Email already Exists" });

  // //===========================  password ================================================================
  if (password) {
    data.password = await bcrypt.hash(password, 10);
    if (!isValidPassword(password)) {
      return res.status(400).send({ status: false, message: "The password must contain an uppercase, a lowercase, a numeric value, a special character and the limit is from 8 to 15 characters." });
    }
  }

  
  // //===========================  Phone ================================================================

  if (phone) {
    if (!isValidPhone(phone))
      res.status(400).send({ status: false, message: "phone is not valid" });
  }

  let UniquePhone = await userModel.findOne({ phone: phone });
  if (UniquePhone) return res.status(400).send({ status: false, message: "Phone already Exists" });

  if (address) {
    try {
      address = JSON.parse(address);
      data["address"] = address;
    } catch (e) {
      return res.status(400).send({ status: false, message: "please provided valid address" });
    }
    
  }

  if (files) {
    if (files.length > 0) {
      // let image = files[0]
      //   let imagename = image.originalname
      //   if (!/^.*\.(jpg|JPG|gif|GIF|doc|DOC|pdf|PDF|PNG|png)$/.test(imagename)) return res.status(400).send({ status: false, message: "file only accept pdf,jpg ,png, doc" })
      //upload to s3 and get the uploaded link
      // res.send the link back to frontend/postman
      var uploadedFileURL = await uploadFile(files[0]);
    }
  }

  let update = await userModel.findByIdAndUpdate({ _id: userId }, data, { new: true });

  res.status(200).send({ status: true, message: "Update user profile is successful", data: update });
};

module.exports.updateUser = updateUser;
module.exports.postUser = postUser;
module.exports.loginUser = loginUser;
module.exports.getUserProfile = getUserProfile;
