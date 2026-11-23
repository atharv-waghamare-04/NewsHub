import { useEffect } from "react"
import Navbar from "../../components/dashboard/Navbar"
import { useNavigate } from "react-router"

const Home = () => {

  const navigate=useNavigate()
useEffect(()=>{

  if(!sessionStorage.getItem("token")){
    navigate("/dashboard/signin")
  }
},[navigate])

  return (
  <>
  <Navbar/>
  
  </>
  )
}

export default Home
