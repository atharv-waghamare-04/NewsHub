const mongoose=require("mongoose")


const dbToConnect=async()=>{
    try {
        
        await mongoose.connect(process.env.MONGO_DB_URL)
        console.log("DB is Connected Successfully");
        
    } catch (error) {
        
        console.error("MongoDB connection failed:", error.message);
        throw error;
        
    }
}

module.exports=dbToConnect