import api from "../../services/api";

export const getDocuments = async () => {
  try {
    const { data } = await api.get("/api/stn/getAllStnDocuments");
    return data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch documents",
    );
  }
};

export const uploadFile = async (file, invoiceSTN) => {
  try {
    const formData = new FormData();
    formData.append("stnFile", file);
    formData.append("invoice_stn", invoiceSTN); // ⬅️ NEW FIELD

    const response = await api.post("/api/stn/uploadStn", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to upload file");
  }
};

export const deleteDocument = async (documentId) => {
  try {
    const response = await api.delete(`/api/stn/deleteStn`, {
      params: { documentId },
    });
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to delete document",
    );
  }
};

export const extractDocument = async (invoiceSTN) => {
  try {
    const response = await api.get(`/api/stn/extractPdf`, {
      params: { invoice_stn: invoiceSTN },
    });
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to extract document",
    );
  }
};

// Task 1: Auto Allocation of Bags on STN Upload

export const consolidateStn = async (invoiceSTN) => {
  try {
    const response = await api.post(`/api/stn/consolidate`, {
      invoice_stn: invoiceSTN,
    });
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to consolidate STN",
    );
  }
};

export const getAllocations = async (invoiceSTN) => {
  try {
    const response = await api.get(`/api/stn/getAllocations`, {
      params: { invoice_stn: invoiceSTN },
    });
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch allocations",
    );
  }
};

export const assignLocation = async (invoiceSTN) => {
  try {
    const response = await api.post(`/api/stn/allocate`, {
      invoice_stn: invoiceSTN,
    });
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to assign location",
    );
  }
};

export const releaseLocation = async (invoiceSTN) => {
  try {
    const response = await api.post(`/api/stn/release`, {
      invoice_stn: invoiceSTN,
    });
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to release location",
    );
  }
};

export const manualAssignLocation = async (invoiceSTN, gardenInvoice, location, force = false) => {
  try {
    const response = await api.post(`/api/stn/manualAssign`, {
      invoice_stn: invoiceSTN,
      garden_invoice: gardenInvoice,
      location,
      force,
    });
    return response;
  } catch (error) {
    if (error.response) {
      // Return the structured {status, message, data} body the backend sent
      // (e.g. insufficient capacity) instead of collapsing it into a plain
      // Error — the caller needs `data.insufficientCapacity` to offer an
      // "assign anyway?" override rather than just failing.
      return error.response;
    }
    throw new Error("Failed to manually assign location");
  }
};
