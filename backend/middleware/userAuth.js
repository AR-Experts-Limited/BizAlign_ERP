const jwt = require('jsonwebtoken');

const userAuth = async (req, res, next) =>{
    const {token} = req.cookies;

    if(!token){
        return res.json({success:false,message:'No token! Not Authourized'})
    }

    try{
        const tokenDecode = jwt.verify(token, 'secret');
        if(tokenDecode.userId){
            req.body.userId = tokenDecode.userId
        }
        else{
            return res.json({success:false,message:'Not Authourized'})
        }
        next();
    }
    catch(error){
        return res.status(401).json({message:'Error'})
    }
}

module.exports = userAuth;