import styles from "./Login.module.css";
import bglogo from "../images/logo-bg.png";
function Header() {
  return (
    <>
      <div className={` ${styles.logocol}`}>
        <img className={styles.logo} src={bglogo} alt="logo-bg" />
      </div>
    </>
  );
}

export default Header;
