import React from 'react';
import ReactDOM from 'react-dom';
import { MemoryRouter as Router } from "react-router-dom";
import { NavigraphAuthProvider } from "./Api/Naivgraph/hooks/useNavigraphAuth";
import App from './App';
import './styles/index.css';

const reactMount = document.getElementById('MSFS_REACT_MOUNT') as HTMLElement;
const getRenderTarget = () => reactMount;

const render = (Slot: React.ReactElement) => {

    ReactDOM.render(
        <Router>
            <NavigraphAuthProvider>
                {Slot}
            </NavigraphAuthProvider>
        </Router>,
        getRenderTarget()
    );

}


render(<App />);
