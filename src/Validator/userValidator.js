const mongoose = require('mongoose')


function isEmail(emailAdress) {
  let regex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  // w use for char * use for breakpoint $ for end
  return regex.test(emailAdress)
}

const isValidate = function (value) {
  if (typeof value === "undefined" || value === null) return false;
  if (typeof value === "string" && value.trim().length > 0) return true;
  return false;
};

const isValidPassword = (Password) => {
  return /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,15}$/.test(Password)
};

const isValidPincode = (num) => {
  return /^[0-9]{6}$/.test(num);//492001
}

const isValidString = (String) => {
  return /\d/.test(String)
}
const isValidPhone = (Mobile) => {
  return /^[6-9]\d{9}$/.test(Mobile)
};
const isValidObjectId = (objectId) => {
  return mongoose.Types.ObjectId.isValid(objectId);
}
const isValidSize = (availableSizes) => {
  for( i=0 ;i<availableSizes.length; i++){
    if(!["S", "XS","M","X", "L","XXL", "XL"].includes(availableSizes[i])) return false
  }
  return true
}

const isValidPrice = (price) => {
  return /^[1-9]\d{0,7}(?:\.\d{1,2})?$/.test(price)
}


module.exports = { isEmail, isValidPassword, isValidate, isValidString, isValidPincode, isValidPhone, isValidObjectId, isValidSize, isValidPrice }
