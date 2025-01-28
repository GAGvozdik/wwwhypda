import React from 'react';
import styles from '../menu.module.scss';
import axios from "axios";
import { useState } from "react";
// import Footer from "./Footer";
// import "./Login.css";

interface MyEvent extends React.ChangeEvent<HTMLInputElement> {
  // Дополнительные свойства, если необходимо
  customProperty?: string;
}

const Contribute: React.FC = () => {

    const [password, setPassword] = useState("");
    const [username, setUsername] = useState("");




    return (
        <div className={styles.treeText}>
            <h2>Contribute</h2>

            <div >

                {/* <form method="post" >
                    <input
                        type="text"
                        id=""
                        placeholder="Username"
                        name="username"
                        required
                        value={username}
                        onChange={handleUsernameChange}
                    />
                    <input
                        type="text"
                        id=""
                        placeholder="Your email"
                    />
                    <input
                        type="password"
                        required
                        placeholder="Your Password"
                        name="password"
                        value={password}
                        onChange={handlePasswordChange}
                    />
                </form>
                <button type="submit" onClick={handleLogin}>
                    Log In
                </button> */}

            </div>
        </div>
    );
};

export default Contribute;