const productModel = require("../model/productModel")
const { isValidate, isValidObjectId, isValidSize, isValidPrice } = require("../Validator/userValidator");
const { validate } = require("../model/userModel");
const { uploadFile } = require('../utils/awsUpload');


const product = async function (req, res) {
  try {
    let data = req.body
    let files = req.files

    if (Object.keys(data).length == 0)
      return res.status(400).send({ status: false, message: "Please provide some details for the product!!" });

    let { title, description, price, currencyId, currencyFormat, isFreeShipping, style, installments, availableSizes } = data;

    //---------title-------------
    if (!title) return res.status(400).send({ status: false, message: "Title is mandatory field" })
    let uniqueTitle = await productModel.findOne({ title: title })
    if (uniqueTitle) return res.status(400).send({ status: false, message: "Title should be unique" })

    //----------description---------
    if (data.description || typeof data.description == 'string') {
      //checking for product description
      if (!isValidate(data.description)) return res.status(400).send({ status: false, message: "Description should not be an empty string or any numbers in it" });
    };

    //-----------price---------------
    if (data.price || typeof data.price == 'string') {
      //checking for product price
      if (!isValidPrice(data.price)) return res.status(400).send({ status: false, message: "Price of product should be valid and in numbers" });
    }

    //-----------currency----------------
    if (data.currencyId || typeof data.currencyId == 'string') {
      //checking for currencyId 
      if (!isValidate(data.currencyId)) return res.status(400).send({ status: false, message: "Currency Id of product should not be an empty spaces" });

      if (!(/INR/.test(data.currencyId))) return res.status(400).send({ status: false, message: "Currency Id of product should be in uppercase 'INR' format" });
    }

    //---------currency formate-----------
    if (data.currencyFormat || typeof data.currencyFormat == 'string') {
      //checking for currency formate
      if (!isValidate(data.currencyFormat)) return res.status(400).send({ status: false, message: "Currency format of product should not be an empty spaces" });

      if (!(/₹/.test(data.currencyFormat))) return res.status(400).send({ status: false, message: "Currency format/symbol of product should be in '₹' " });
    }

    //------------for product image--------
    if ((files && files.length) > 0) {
      //upload to s3 and get the uploaded link
      // res.send the link back to frontend/postman
      var productImage = await uploadFile(files[0]);
    } else {
      return res.status(400).send({ status: false, message: "please add product image!!" });
    }

    //checking for available Sizes of the products
   
    if (availableSizes || availableSizes == "") {
      availableSizes = availableSizes.toUpperCase().split(",").map((x)=> x.trim()) // Creating an array
      data.availableSizes = availableSizes;
      if (!isValidSize(availableSizes)) {
        return res.status(400).send({ status: false, message: "please provide the product sizes among : [S , XS , M , X , L , XXL , XL ]" })
      } 
    }

    let product = {
      title: title,
      description: description,
      price: price,
      currencyId: currencyId,
      currencyFormat: currencyFormat,
      isFreeShipping: isFreeShipping,
      productImage: productImage,
      style: style,
      availableSizes: data.availableSizes,
      installments: installments
    };

    let createProduct = await productModel.create(product);
    
    return res.status(201).send({ status: true, message: "Success", data: createProduct });

  } catch (err) {
    return res.status(500).send(err.message)
  }

}

//*************************Get products by filters******************************/

const getProductByFilters = async function (req, res) {
  try {
    let query = req.query
    let checkDelete = { isDeleted: false } //checking if isDeleted is false or not
    let sortArr = {}

    let { name, size, priceSort, priceGreaterThan, priceLessThan } = query

    let getProducts = productModel.find(checkDelete).sort({ price: 1 })
    if (isValidate(query)) {
      if (getProducts.length == 0) {
        return res.status(404).send({ status: false, message: "No product found" })
      }
      return res.status(200).send({ status: true, message: "Products available are :-", data: getProducts })
    }

    // name describes the title 
    if (query.name) {
      if (!isValidate(name)) {
        return res.status(400).send({ status: false, message: "Product name/title should be valid!!!" })
      }
      // new regex for fetching the title from postman 
      const regexName = new RegExp(query.name, "g")
      checkDelete["title"] = { $regex: regexName }
    }

    // priceGreaterThan links with the price
    if (query.priceGreaterThan) {
      if (!isValidate(priceGreaterThan)) {
        return res.status(400).send({ status: false, message: "Enter the valid price..." })
      }
      checkDelete["price"] = { $gt: Number(priceGreaterThan) }
    }

    if ((query.priceLessThan) || (typeof query.priceLessThan == "string")) {
      if (!isValidate(priceLessThan)) {
        return res.status(400).send({ status: false, message: "Enter the valid price..." })
      }
      checkDelete["price"] = { $lt: Number(priceLessThan) }
    }

    if (query.priceSort) {
      if (!["-1", "1"].includes(priceSort)) {
        return res.status(400).send({ status: false, message: "For sorting the data in assending order [1] else in decending order please provide [-1]" })
      }
      sortArr["price"] = Number(priceSort)
    }

    if (size) {
      if (typeof (query.size) || typeof query.size == 'string') {
        query.size = query.size.toUpperCase();
        if (!isValidate(query.size)) return res.status(400).send({ status: false, message: "Enter a valid value for size and remove spaces" })

        checkDelete.availableSizes = {}
        checkDelete.availableSizes = { $in: query.size }
      }
    }

    const returnAllProduct = await productModel.find(checkDelete).sort(sortArr)
    if (returnAllProduct.length == 0) return res.status(404).send({ status: false, message: "No product found" })
    return res.status(200).send({ status: true, message: "Success", data: returnAllProduct })


  } catch (error) {
    return res.status(500).send({ status: false, message: error.message })
  }
}

//*********************Get products by ID***************************/

let getProductsById = async (req, res) => {
  try {
    let productId = req.params.productId;

    //checking is product id is valid or not
    if (!isValidObjectId(productId)) {
      return res.status(400).send({ status: false, message: 'Please provide valid productId' })
    }

    //getting the product by it's ID
    const product = await productModel.findOne({ _id: productId, isDeleted: false })
    if (!product) return res.status(404).send({ status: false, message: "No product found" })

    return res.status(200).send({ status: true, message: 'Success', data: product })
  } catch (err) {
    res.status(500).send({ status: false, error: err.message })
  }
}

//*********************update products******************************/

let updateProductsById = async (req, res) => {
  try {
    let productsId = req.params.productId

    if (!isValidObjectId(productsId)) return res.status(400).send({ status: false, message: "please enter a valid  product Id" })

    const products = await productModel.findOne({ _id: productsId, isDeleted: false })
    if (!products) return res.status(400).send({ status: false, message: "No products Found" })
    if (product.isDeleted == true) return res.status(400).send({ status: false, message: "product already deleted" })

    let data = req.body
    let files = req.files
    if ((files && files.length) > 0) {
      //upload to s3 and get the uploaded link
      // res.send the link back to frontend/postman
      var productImage = await uploadFile(files[0]);
    }


    // if(!isValidate(data))  return res.status(400).send({status:false,message:"no data found for update"})
    if (data.isDeleted || data.deletedAt) return res.status(400).send({ status: false, message: "Forbidden" })

    // if(isValidate(data.title)) return res.status(400).send({status:false,message:"title should not be empty"})
    let UniqueTitle = await productModel.findOne({ title: data.title })
    if (UniqueTitle) return res.status(400).send({ status: false, message: "Title should be unique" })

    if (data.description || typeof data.description == 'string') {
      //checking for product description
      if (!isValidate(data.description)) return res.status(400).send({ status: false, message: "Description should not be an empty string or any numbers in it" });
    };

    if (data.price || typeof data.price == 'string') {
      //checking for product price
      if (!isValidPrice(data.price)) return res.status(400).send({ status: false, message: "Price of product should be valid and in numbers" });
    }

    if (data.currencyId || typeof data.currencyId == 'string') {
      //checking for currencyId 
      if (!isValidate(data.currencyId)) return res.status(400).send({ status: false, message: "Currency Id of product should not be an empty spaces" });

      if (!(/INR/.test(data.currencyId))) return res.status(400).send({ status: false, message: "Currency Id of product should be in uppercase 'INR' format" });
    }

    if (data.currencyFormat || typeof data.currencyFormat == 'string') {
      //checking for currency formate
      if (!isValidate(data.currencyFormat)) return res.status(400).send({ status: false, message: "Currency format of product should not be an empty spaces" });

      if (!(/₹/.test(data.currencyFormat))) return res.status(400).send({ status: false, message: "Currency format/symbol of product should be in '₹' " });
    }

    //checking freeShipping value is present
    if (data.isFreeShipping || typeof data.isFreeShipping == 'string') {
      //converting it to lowercase and removing white spaces
      data.isFreeShipping = data.isFreeShipping.toLowerCase().trim();;
      if (data.isFreeShipping == 'true' || data.isFreeShipping == 'false') {
        //convert from string to boolean
        data.isFreeShipping = JSON.parse(data.isFreeShipping);
      } else {
        return res.status(400).send({ status: false, message: "Enter a valid value for isFreeShipping" })
      }

      if (typeof data.isFreeShipping !== 'boolean') return res.status(400).send({ status: false, message: "Free shipping should be in boolean value" })
    }

    //checking for style in data
    if (data.style || typeof data.style == 'string') {
      if (!isValidate(data.style)) return res.status(400).send({ status: false, message: "Style should be valid an does not contain numbers" });
    }

    if (data.availableSizes || typeof data.availableSizes == 'string') {
      //checking for available Sizes of the products
      if (!isValidate(data.availableSizes)) return res.status(400).send({ status: false, message: "Enter at least one available size" });

      data.availableSizes = JSON.parse(data.availableSizes);

      for (let i = 0; i < data.availableSizes.length; i++) {
        if (!validate.isValidSize(data.availableSizes[i])) {
          return res.status(400).send({ status: false, message: "Sizes should one of these - 'S', 'XS', 'M', 'X', 'L', 'XXL' and 'XL'" })
        }
      }
    }

    //checking for installments in data
    if (data.installments || typeof data.installments == 'string') {
      if (!isValidate(data.installments)) return res.status(400).send({ status: false, message: "Installments should be in numbers and valid" });
    }

    let updatedProduct = await productModel.findByIdAndUpdate({ _id: productsId }, data, { new: true })
    return res.status(200).send({ status: true, message: 'Success', data: updatedProduct })

  } catch (error) {
    return res.status(500).send({ status: false, message: error.message })
  }

}

//*******************************delete API****************************/

const deleteProductById = async (req, res) => {
  try {
    const productId = req.params.productId;

    if (!isValidObjectId(productId)) {
      return res.status(400).send({ status: false, message: "invalid productId" });
    }

    let product = await productModel.findOne({ _id: productId, isDeleted: false });
    if (product == null) {
      return res.status(404).send({ status: false, message: "Product document does not exist or already deleted" });
    }

    let deleteProduct = await productModel.findOneAndUpdate(
      { _id: productId },
      { $set: { isDeleted: true, deletedAt: new Date().toISOString() } },
      { new: true, upsert: true }
    );
    return res.status(200).send({ status: true, message: "Product document deleted successfully" });
  } catch (err) {
    res.status(500).send({ status: false, message: err.message });
  }
};


module.exports.product = product
module.exports.getProductsById = getProductsById
module.exports.updateProductsById = updateProductsById
module.exports.deleteProductById = deleteProductById
module.exports.getProductByFilters = getProductByFilters