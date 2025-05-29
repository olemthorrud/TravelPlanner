import {useNavigate} from 'react-router-dom';
import React from 'react';
import styles from './Landing.module.css';

import image1 from '../../assets/IMG_5863.png';
import image2 from '../../assets/IMG_1763.png';
import image3 from '../../assets/IMG_1688.png';
import image4 from '../../assets/IMG_3486.png';

export default function Landing() {
  const navigate = useNavigate();

  const navigateLogin = () => {
    navigate('/login');
  };

  return (
    <div className={styles.landingPage}>
      <div className={styles.header}>
        <h1>TRAVEL<br/>PLANNER</h1>
        <div className={styles.description}>
          <p>Your organizing platform for everything related to your next vacation</p>
          <button className="btn" onClick={navigateLogin}>Get started</button>
        </div>
      </div>
      <div className={styles.images}>
        <img src={image1} alt="img1"/>
        <img src={image2} alt="img2" />
        <img src={image3} alt="img3" />
        <img src={image4} alt="img4" />
      </div>
    </div>
  );
}