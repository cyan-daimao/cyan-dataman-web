import "./App.less"
import {RouterProvider} from "react-router-dom";
import router from "./router";
import 'antd/dist/reset.css';
import RouterErrorBoundary from "@/component/error-boundary/RouterErrorBoundary";

function App() {

    return (
        <RouterErrorBoundary>
            <RouterProvider router={router}/>
        </RouterErrorBoundary>
    )
}


export default App
