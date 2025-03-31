const mongoose = require('mongoose');

const checkOutSchema = new mongoose.Schema({
    userId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Auth',
    },
    product:[
        {
            productId:{
                type: mongoose.Schema.Types.ObjectId,
                ref: 'PostAd'
            },
            quantity:{
                type: Number,
                required: true,
                default: 1
            }
        }
    ],
    reference:{
        type: String,
     
    },
    trxref:{
        type: String,
    },
    status:{
        type: Boolean,
    }

},{
    timestamps: true
});

module.exports = mongoose.model('CheckOut', checkOutSchema);