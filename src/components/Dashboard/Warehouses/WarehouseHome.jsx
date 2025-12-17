
import React from "react";
import NewWarehouseViewModal from "./NewWarehouseViewModal";
import DeleteWarehouseViewModal from "./DeleteWarehouseViewModal";
import OngoingWarehousesPage from './OngoingWarehouse';

function WarehouseHome({ navigate, managers, products, isAdmin }) {
  return (
    <>
      <div className="row m-0 p-3">
        <div className="col">
          {isAdmin && (
            <>
              <NewWarehouseViewModal managers={managers} products={products} />
              <DeleteWarehouseViewModal />
            </>
          )}
        </div>
      </div>

      {/* Direct Embed of Ongoing Warehouses */}
      <div className="p-3">
        <OngoingWarehousesPage navigate={navigate} />
      </div>
    </>
  );
}

export default WarehouseHome;
