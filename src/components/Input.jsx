import { useState } from "react";
import styles from "./Login.module.css";
import axios from "axios";
import OTP from "./OTP";
import Loading from "./Loading";
import ErrorModal from "./ErrorModal";

function Input({ setLogin, setUser, setRole }) {
  const [ontap, setOntap] = useState(false);
  const [email, setEmail] = useState('');
  const [res, setRes] = useState();
  const [resp, setResp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const onChange = (e) => {
    const onlyNums = e.target.value.replace(/[^0-9]/g, '');
    setEmail(onlyNums)};

  const onSubmit = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    setOntap(true);
    setResp(true);
    setLoading(true);

    const VITE_API = import.meta.env.VITE_API_URL;

    // Detect if running on mobile device
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isMobileBrowser = window.innerWidth <= 768 || isMobileDevice;

    try {
      const response = await axios.post(`${VITE_API}/auth/login`, {
        mobile: email,
        allowMobile: true, // Explicitly allow mobile login
        deviceType: isMobileBrowser ? 'mobile' : 'web',
      }, {
        headers: {
          'X-Allow-Mobile': 'true', // Header to indicate mobile access should be allowed
          'X-Device-Type': isMobileBrowser ? 'mobile' : 'web',
        }
      });

      setRes(response.data);
      if (response.status === 200) {
        setLoading(false);
        setResp(true);
      } else {
        setResp(false);
        setOntap(false);
      }
    } catch (e) {
      setOntap(false);
      setError(e.response?.data?.message || "Server error");
      setIsModalOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => setIsModalOpen(false);

  return (
    <>
      <div className={styles.inputbox}>
        <div className={styles.wel}>
          <h1>Welcome!</h1>
        </div>
        <div className={styles.inputContainer}>
          <form onSubmit={onSubmit}>
            <p className={styles.p}>Login to continue</p>
            <label className={styles.label}>Mobile number</label>
            <input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]{10}"
              maxLength={10}
              onChange={onChange}
              value={email}
              className={styles.input}
              required
            />
            {!ontap && (
              <button
                type="submit"
                className={styles.sendbutton}
              >
                Send OTP
              </button>
            )}
          </form>
          {loading && (
            <div className={styles.loadingdiv}>
              <Loading />
            </div>
          )}
          {ontap && !loading && resp && (
            <OTP
              email={email}
              resendOtp={onSubmit}
              setLogin={setLogin}
              setUser={setUser}
              setRole={setRole}
            />
          )}
        </div>
        {isModalOpen && (
          <ErrorModal
            isOpen={isModalOpen}
            message={error}
            onClose={closeModal}
          />
        )}
      </div>
    </>
  );
}

export default Input;
