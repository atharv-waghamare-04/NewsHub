import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import "./App.css";
import Home from "./pages/dashboard/Home";
import Signin from "./pages/dashboard/Signin";
import Categories from "./pages/dashboard/Categories";
import News from "./pages/dashboard/News";
import SiteHome from "./pages/site/SiteHome";
import UserAuth from "./pages/site/UserAuth";
import BuyNow from "./pages/site/BuyNow";
import NewsApiGuide from "./pages/site/NewsApiGuide";
import { RequireAdmin } from "./components/RouteGuards";

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<SiteHome />} />
      <Route path="/login" element={<UserAuth key="login" mode="login" />} />
      <Route path="signup" element={<UserAuth key="signup" mode="signup" />} />
      <Route
        path="/forgot-password"
        element={<UserAuth key="forgot" mode="forgot" />}
      />
      <Route path="/buy-now" element={<BuyNow />} />
      <Route path="/news-api" element={<NewsApiGuide />} />

      <Route path="/dashboard/signin" element={<Signin />} />
      <Route element={<RequireAdmin />}>
        <Route path="/dashboard" element={<Home />} />
        <Route path="/dashboard/categories" element={<Categories />} />
        <Route path="/dashboard/catgories" element={<Categories />} />
        <Route path="/dashboard/news" element={<News />} />
        <Route path="/dashboard/articles" element={<News />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
);

export default App;
