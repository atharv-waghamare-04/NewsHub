const mongoose=require("mongoose")


const adminSchema=new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    email:{
           type:String,
           unique:true,
           required:true,
           lowercase:true,
           trim:true
    },
    mobile_no: {
      type: String,
      unique: true,
      required: true,
      minlength: 10,
      maxlength: 10,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    tokenVersion: {
      type: Number,
      default: 0,
      min: 0,
      select: false,
    },
    login_history: {
      type: [Date],
      default: [],
    }

},{timestamps:true})

const AdminModel=mongoose.model("nh_admin_details",adminSchema)

module.exports=AdminModel