const axios = require("axios");

const initializePayment = async (transactionData) => {

    try {
        const headers = {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json',
        }
        const response = await axios.post("https://api.paystack.co/transaction/initialize",
            transactionData,
            { headers }
        )
        return response.data;
        
    } catch (error) {
        console.error('Error initializing payment:', error.message);
        return null;
        
    }
    
}


const verifyPaymentStatus = async (trxref)=>{
    try {
        const verifyUrl = `https://api.paystack.co/transaction/verify/${trxref}`
        const response = await axios.get(verifyUrl,{
            headers:{
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            }
        })
        return response.data;
    
    } catch (error) {
        console.error('Error verifying payment status:', error.message);
        return null;
    }
}

  
   

module.exports = {initializePayment, verifyPaymentStatus};