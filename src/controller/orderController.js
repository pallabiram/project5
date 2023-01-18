const cartModel = require("../model/cartModel")
const orderModel = require("../model/orderModel")
const { isValidate, isValidObjectId } = require("../Validator/userValidator");

//***********************create Order*****************************/

const placeOrder = async function (req, res) {
    try {
        let data = req.body
        let userId = req.params.userId

        let { cartId } = data  //destructing

        if (!isValidObjectId(userId)) return res.status(400).send({ status: false, message: "please enter a valid  user Id" })

        let productInCart = await cartModel.findOne({ _id: cartId })
        if (!productInCart) {
            return res.status(400).send({ status: false, message: "user has not added items in cart" })
        }

        let checkUser = await cartModel.findOne({ userId: userId })
        if (!checkUser) {
            return res.status(400).send({ status: false, message: " User Does not exist with given ID" })
        }

        if (productInCart.items.length == 0) {
            return res.status(400).send({ status: false, message: "No product present in cart" })
        }

        let items = productInCart.items
        let totalPrice = productInCart.totalPrice
        let totalItems = productInCart.totalItems
        // check for quantity
        let totalQuantity = 0
        for (let i = 0; i < items.length; i++) {
            totalQuantity += items[i].quantity
        }
        //checking the status
        if (data.status) {
            if (data.status != "pending" && data.status != "completed" && data.status != "cancelled")
                return res.status(400).send({ status: false, message: " status should be :- [cancelled , completed , pending]" })
        }
        if (data.cancellable == false) {
            cartPresent.cancellable = data.cancellable
        }

        let orders = {
            userId: userId,
            items: items,
            totalPrice: totalPrice,
            totalItems: totalItems,
            totalQuantity: totalQuantity,
            status: data.status

        }

        let createOrder = await orderModel.create(orders)
        let productDataAll = await orderModel.findOne({ userId: userId }).populate({ path: 'items.productId', select: { '_id': 1, 'title': 1, 'price': 1, 'productImage': 1 } })

        return res.status(201).send({ status: true, message: "Success", data: productDataAll })

    }
    catch (err) {
        return res.status(500).send({ status: false, message: err.message })
    }
}

//**********************************update Order************************/

const updateOrder = async function (req, res) {
    try {
        let data = req.body
        let { orderId } = data
        // if(isValidate(data)) return res.status(400).send({status:false,message:"Input not found"})

        if (!orderId) return res.status(400).send({ status: false, message: "OrderId is required" })
        if (!isValidObjectId(orderId)) return res.status(400).send({ status: false, message: "OrderId is not valid" })

        let findOrder = await orderModel.findOne({ _id: data.orderId, isDeleted: false })
        if (!findOrder) return res.status(400).send({ status: false, message: `Order not found by this'${data.orderId}'` })

        if (!isValidate(data.status)) return res.status(400).send({ status: false, message: "status is required" })
        if (!(["pending", "completed", "cancelled"].includes(data.status))) return res.status(400).send({ status: false, message: "Order status should be one of this 'pending','completed' and 'cancelled'" });

        let conditions = {};

        if (data.status == "cancelled") {
            //checking if the order is cancellable or not
            if (!findOrder.cancellable) return res.status(400).send({ status: false, message: "You cannot cancel this order" });
            conditions.status = data.status;
        } else {
            conditions.status = data.status;
        }

        let resData = await orderModel.findByIdAndUpdate({ _id: findOrder._id }, conditions, { new: true })
        res.status(200).send({ status: true, message: "Success", data: resData });
    }
    catch (err) {
        return res.status(500).send({ status: false, message: err.message })
    }
}
module.exports.placeOrder = placeOrder
module.exports.updateOrder = updateOrder