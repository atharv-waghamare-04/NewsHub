const { default: mongoose } = require("mongoose");

const contentSchema=new mongoose.Schema({
headline:{
    type:String,
    required:true
},
description:{
      type:String,
    required:true
}
})


const newsSchema=new mongoose.Schema({
    title:{
        type:String,
        required:true
    },
    image:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true
    },
    category_name:{
        type:String,
        required:true
    },
    author:{
        type:String,
        required:true
    },
    content:{
        type:[contentSchema],
        required:true
    },
    status:{
        type:String,
        required:true,
        enum:["Active","Inactive"],
        default:"Active"
    }
},{timestamps:true})

newsSchema.index({title:1,description:1,category_name:1,author:1,content:1})
newsSchema.index({title:-1,description:-1,category_name:-1,author:-1,content:-1})
newsSchema.index({title:"text",description:"text",category_name:"text",author:"text",content:"text"})

const NewsModel=mongoose.model("nh_news_details",newsSchema)

module.exports=NewsModel