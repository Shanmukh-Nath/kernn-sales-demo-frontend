import React, { useState } from "react";
import styles from "./Products.module.css";
import { DialogActionTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/Auth";
import ErrorModal from "@/components/ErrorModal";
import Loading from "@/components/Loading";

function TaxModal({ tax, trigger, setTrigger }) {
  const [editclick, setEditclick] = useState(false);

  const onEditClick = () => setEditclick(!editclick);

  const [name, setName] = useState(tax.name);
  const [percentage, setPercentage] = useState(tax.percentage);
  const [description, setDescription] = useState(tax.description);

  const [successfull, setSuccessfull] = useState(null);

  const [error, setError] = useState();
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const closeModal = () => {
    setIsModalOpen(false);
  };

  const [errors, setErrors] = useState({});

  const today = new Date(Date.now()).toISOString().slice(0, 10);

  const validateFields = () => {
    const newErrors = {};
    if (!name) newErrors.name = true;
    if (!percentage) newErrors.percentage = true;
    if (!description) newErrors.description = true;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // form subbmission

  const { axiosAPI } = useAuth();

  const onSubmitClick = () => {
    // console.log(name, percentage, description);

    //  if (!validateFields()) {
    //    setError("Please Fill all feilds");
    //    setIsModalOpen(true);
    //    return;
    //  }
    async function create() {
      try {
        setLoading(true);
        const res = await axiosAPI.put(`/tax/${tax.id}`, {
          name: name,
          percentage: percentage,
          description: description,
        });

        // console.log(res);
        setTrigger(!trigger);
        setSuccessfull(res.data.message);
      } catch (e) {
        console.log(e);
        setError(e.response.data.message);
        setIsModalOpen(true);
      } finally {
        setLoading(false);
      }
    }

    create();
  };

  return (
    <>
      <h3 className={`px-3 pb-3 mdl-title`}>Taxes</h3>
      <div className="row justify-content-center">
        <div className={`col-4  inputcolumn-mdl`}>
          <label htmlFor="">Date :</label>
          <input
            type="date"
            value={tax.createdAt.slice(0, 10)}
            disabled={!editclick}
          />
        </div>
      </div>{" "}
      <div className="row justify-content-center">
        <div className={`col-4  inputcolumn-mdl`}>
          <label htmlFor="">Tax Name :</label>
          <input
            type="text"
            value={name}
            required
            onChange={(e) => setName(e.target.value)}
            disabled={!editclick}
          />
        </div>
      </div>{" "}
      <div className="row justify-content-center">
        <div className={`col-4  inputcolumn-mdl`}>
          <label htmlFor="">Percentage :</label>
          <input
            type="number"
            value={percentage}
            onChange={(e) => setPercentage(e.target.value)}
            disabled={!editclick}
          />
        </div>
      </div>
      <div className="row justify-content-center">
        <div className={`col-4  inputcolumn-mdl`}>
          <label htmlFor="">Description :</label>
          <textarea
            name=""
            id=""
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={!editclick}
          ></textarea>
        </div>
      </div>
      {!editclick && (
        <div className="row m-0 p-3 justify-content-center">
          <div className="col-5">
            <button className="submitbtn" onClick={onEditClick}>
              Edit
            </button>
            <DialogActionTrigger asChild>
              <button className="cancelbtn">Close</button>
            </DialogActionTrigger>
          </div>
        </div>
      )}
      {editclick && !loading && !successfull && (
        <div className="row pt-3 mt-3 justify-content-center">
          <div className={`col-5`}>
            <button
              type="submit"
              className={`submitbtn`}
              data-bs-dismiss="modal"
              onClick={onSubmitClick}
            >
              Update
            </button>
            <DialogActionTrigger asChild>
              <button
                type="button"
                className={`cancelbtn`}
                data-bs-dismiss="modal"
              >
                Close
              </button>
            </DialogActionTrigger>
          </div>
        </div>
      )}
      {successfull && (
        <div className="row pt-3 mt-3 justify-content-center">
          <div className={`col-6`}>
            <DialogActionTrigger asChild>
              <button
                type="submit"
                className={`submitbtn`}
                data-bs-dismiss="modal"
              >
                {successfull}
              </button>
            </DialogActionTrigger>
          </div>
        </div>
      )}
      {loading && (
        <div className="row pt-3 mt-3 justify-content-center">
          <div className={`col-5`}>
            <Loading />
          </div>
        </div>
      )}
      {isModalOpen && (
        <ErrorModal isOpen={isModalOpen} message={error} onClose={closeModal} />
      )}
    </>
  );
}

export default TaxModal;
