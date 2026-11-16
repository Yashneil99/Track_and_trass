import {
  Autocomplete,
  TextField,
  Button,
  Box,
  Snackbar,
  Alert,
  Select,
  InputLabel,
  MenuItem,
  FormControl,
} from "@mui/material";
import "./admin.css";
import { useEffect, useState } from "react";
import { fetchAllLocation } from "../../features/location/locationSlice";
import { getAvailableBins } from "../../features/location/locationService";
import { useDispatch, useSelector } from "react-redux";
import { fetchMaterials } from "../../features/material/materialSlice";
import {
  createMaterialMovement,
  clearMaterialMovementError,
} from "../../features/materialMovement/materialMovementSlice";

export default function MovementForm({ onClose }) {
  const dispatch = useDispatch();
  const [openSnack, setOpenSnack] = useState(false);
  const [snackMsg, setSnackMsg] = useState("");
  const [snackSeverity, setSnackSeverity] = useState("success");
  
  const { list: location } = useSelector((state) => state.location);
  const { data: material } = useSelector((state) => state.material);
  const { data: movements } = useSelector((state) => state.materialMovement);

  const [materialValue, setMaterialValue] = useState(null);
  const [locationValue, setLocationValue] = useState("");
  const [purposeValue, setPurposeValue] = useState("");
  const [statusValue, setStatusValue] = useState("");
  // Quantity is always 1 — one movement row per bag, never a batch. No state.

  const [isAutoFilled, setIsAutoFilled] = useState(false);

  // Free space per bin, keyed by code. remaining_capacity is already net of
  // occupancy AND reserved STN allocations, so it is the same number the STN
  // manual-assign picker shows.
  //
  // ponytail: dropdown-only guard. /addNewMovement still accepts a full bin —
  // addNewMaterialMovement is a plain INSERT with no capacity check — so the
  // handheld and any direct API caller can still overfill. Put the check in
  // addNewMaterialMovement if that ever matters.
  const [freeByCode, setFreeByCode] = useState({});

  useEffect(() => {
    dispatch(fetchAllLocation());
    dispatch(fetchMaterials());
    getAvailableBins()
      .then((res) =>
        setFreeByCode(
          Object.fromEntries(
            (res?.data || []).map((b) => [
              b.location_code,
              parseInt(b.remaining_capacity, 10) || 0,
            ]),
          ),
        ),
      )
      // Fail open: if the lookup dies, leave every bin selectable rather than
      // locking the operator out of a form the server would have accepted.
      .catch(() => setFreeByCode({}));
  }, [dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = JSON.parse(localStorage.getItem("user"));
    const userId = user?.userId;

    const formData = {
      location: locationValue,
      quantity: 1,
      material: materialValue?.name,
      status: statusValue,
      purpose: purposeValue,
      moved_by: userId,
    };

    try {
      const result = await dispatch(createMaterialMovement(formData));

      if (result.payload?.message === "New Movement Added successfully") {
        setSnackMsg("Material Movement created successfully");
        setSnackSeverity("success");
        setOpenSnack(true);
        
        // Reset form
        setMaterialValue(null);
        setLocationValue("");
        setStatusValue("");
        setPurposeValue("");
        setIsAutoFilled(false);

        e.target.reset();
        onClose?.(false);
      } else {
        setSnackMsg("Failed to create material movement");
        setSnackSeverity("error");
        setOpenSnack(true);
      }
    } catch (err) {
      setSnackMsg("Failed to create material movement: " + (err.message || ""));
      setSnackSeverity("error");
      setOpenSnack(true);
    }
  };

  // --- 1. FILTER MATERIALS: hide bags that have already been dispatched ---
  // Step 2 of the outward flow writes location 'dispatched', which fires the
  // server-side deactivation trigger and flips materials.status to 'inactive'.
  // That flag is the signal to trust: it's maintained server-side and, unlike
  // `movements`, doesn't depend on which fetch last wrote the shared
  // state.materialMovement.data bucket (admin.jsx renders this form without
  // fetching movements at all).
  // The old check was `status !== "outward"` — a dead no-op since migration 002
  // renamed that status to 'Dispatched', which is why dispatched bags were
  // still listed.
  const availableMaterials = material.filter(
    (mat) => (mat.status || "").trim().toLowerCase() !== "inactive"
  );

  const parsedMaterials = availableMaterials.map((mat) => ({
    ...mat,
    layout: typeof mat.layout === "string" ? JSON.parse(mat.layout) : mat.layout,
  }));

  const flattenMaterials = (materials) => {
    let final = [];
    materials.forEach((mat) => {
      final.push({
        ...mat,
        parent: mat.name,
        isParent: false,
        group: mat.name,
        displayName: `${mat.name} - ${mat.code}`,
      });
    });
    return final;
  };

  const materialOptions = flattenMaterials(parsedMaterials);

  // The three states a bag can be moved FROM. A dispatched bag never reaches
  // this list — its RFID is released and materials.status is 'inactive', so the
  // material filter above drops it before it gets here.
  //
  // NOTE: the MenuItem renders value={s.name}, so the string SUBMITTED (and
  // written to material_movements.status) is `name` — Title Case, matching what
  // the device writes. `value` is only a React key + a lowercase alias for the
  // autofill matcher below; it is never submitted.
  const status = [
    { name: "In Transit", value: "intransit" },
    { name: "Moved", value: "moved" },
    { name: "Outward Intransit", value: "outward intransit" }
  ];

  // Location dropdown = real, physical places only. Two things disqualify a row:
  //   • parent_id NULL — a tree root: the warehouse itself ("HUL Kolkata") plus
  //     the virtual system locations ("Dispatched", "Loading Area").
  //   • attributes {}  — the floors (F1, F2). A floor is a level, not a spot a
  //     bag sits in; only bins carry attributes, e.g. {"capacity": 500}.
  // Leaves the six bins.
  const realLocations = (location || []).filter((loc) => {
    if (!loc.parent_id) return false;
    const attrs =
      typeof loc.attributes === "string"
        ? JSON.parse(loc.attributes || "{}")
        : loc.attributes;
    return attrs && Object.keys(attrs).length > 0;
  });

  const purposeOptions = [
    "Initial Location Map",
    "Material In",
    "Material Out",
    "Material Transfer",
    "Inspection",
    "Quality Check",
    "Production Use",
    "Maintenance",
    "Storage",
    "Return",
    "Scrap",
    "Calibration",
    "Dispatch",
    "Repair"
  ];

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      className="data-form"
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        mt: 2,
      }}
    >
      <Autocomplete
        options={materialOptions}
        groupBy={(option) => option.group}
        getOptionLabel={(option) => option.displayName || option.name || ""}
        renderGroup={(params) => (
          <li key={params.key}>
            <ul style={{ paddingLeft: 20 }}>{params.children}</ul>
          </li>
        )}
        renderOption={(props, option) => (
          <li {...props} style={{ paddingLeft: option.isParent ? 0 : 20 }}>
            {option.displayName}
          </li>
        )}
        value={materialValue}
        onChange={(e, value) => {
          setMaterialValue(value);
          
          if (value) {
            // Find the latest movement for this material
            const currentMovement = movements?.find(
              (m) => m.material === value.name
            );

            if (currentMovement) {
              const moveStatus = (currentMovement.status || "").trim().toLowerCase();

              // --- 2. REMOVED OVERRIDE: Standard Location Matching ONLY ---
              const moveLocName = (currentMovement.location || "").trim().toLowerCase();
              const moveLocCode = (currentMovement.location_code || "").trim().toLowerCase();

              const matchedLocation = location?.find((l) => {
                const optCode = (l.code || "").trim().toLowerCase();
                const optName = (l.name || "").trim().toLowerCase();
                
                return (
                  (moveLocCode && optCode === moveLocCode) || 
                  (moveLocName && optName === moveLocName) ||
                  (moveLocName && optCode === moveLocName)
                );
              });
              
              if (matchedLocation) {
                setLocationValue(matchedLocation.code);
              } else {
                setLocationValue(currentMovement.location_code || currentMovement.location || "");
              }
              
              // --- BULLETPROOF STATUS MATCHING ---
              const matchedStatus = status.find(
                s => s.name.toLowerCase() === moveStatus || s.value.toLowerCase() === moveStatus
              );
              
              setStatusValue(matchedStatus ? matchedStatus.name : currentMovement.status || "");
              setPurposeValue(currentMovement.purpose || "");
              setIsAutoFilled(true);
            } else {
              setLocationValue("");
              setStatusValue("");
              setPurposeValue("");
              setIsAutoFilled(false); 
            }
          } else {
            setLocationValue("");
            setStatusValue("");
            setPurposeValue("");
            setIsAutoFilled(false);
          }
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            name="inputMaterial"
            label="Material"
            variant="outlined"
            required
          />
        )}
      />

      {/* Auto-populated Read-Only Fields */}
      {materialValue && materialValue.attributes && (
        <Box sx={{ display: 'flex', gap: 2, flexDirection: 'column', bgcolor: '#f9fafb', p: 2, borderRadius: 1 }}>
          <TextField
            label="Garden"
            value={materialValue.attributes["Garden"] || ""}
            InputProps={{ readOnly: true }}
            variant="filled"
            size="small"
          />
          <TextField
            label="Garden Inv No"
            value={materialValue.attributes["Garden Inv No"] || ""}
            InputProps={{ readOnly: true }}
            variant="filled"
            size="small"
          />
          <TextField
            label="Grade"
            value={materialValue.attributes["Grade"] || ""}
            InputProps={{ readOnly: true }}
            variant="filled"
            size="small"
          />
        </Box>
      )}

      <FormControl fullWidth>
        <InputLabel>Location</InputLabel>
        <Select
          name="location"
          label="Location"
          value={locationValue}
          onChange={(e) => {
            setLocationValue(e.target.value);
            // Unlock Status and Purpose so user can edit them
            setIsAutoFilled(false);
          }}
          required
        >
          {realLocations.map((loc) => {
            // Unknown (bin missing from the lookup, or the lookup failed) stays
            // selectable — only a bin we know is full gets disabled.
            const free = freeByCode[loc.code];
            const full = free !== undefined && free <= 0;
            return (
              <MenuItem key={loc.code} value={loc.code} disabled={full}>
                {loc.name} ({loc.code})
                {free !== undefined && (full ? " · FULL" : ` · ${free} free`)}
              </MenuItem>
            );
          })}
        </Select>
      </FormControl>

      <TextField
        name="quantity"
        label="Quantity"
        variant="filled"
        size="small"
        value={1}
        InputProps={{ readOnly: true }}
      />

      <FormControl fullWidth>
        <InputLabel>Status</InputLabel>
        <Select
          label="Status"
          name="status"
          value={statusValue}
          onChange={(e) => setStatusValue(e.target.value)}
          required
          readOnly={isAutoFilled}
          sx={{ backgroundColor: isAutoFilled ? "#f9fafb" : "inherit" }}
        >
          {status?.map((s) => (
            <MenuItem key={s.value} value={s.name}>
              {s.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Autocomplete
        freeSolo
        options={purposeOptions}
        value={purposeValue}
        onChange={(event, newValue) => {
          setPurposeValue(newValue || "");
        }}
        onInputChange={(event, newInputValue) => {
          setPurposeValue(newInputValue || "");
        }}
        readOnly={isAutoFilled}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Purpose"
            name="purpose"
            required
            sx={{ backgroundColor: isAutoFilled ? "#f9fafb" : "inherit" }}
          />
        )}
      />

      <Button
        type="submit"
        variant="contained"
        className="submit-btn"
        sx={{
          borderRadius: "10px",
          fontWeight: "700",
          background: "linear-gradient(to right, #0f766e, #14b8a6)",
          mt: 2,
        }}
      >
        Submit
      </Button>

      {openSnack && (
        <Snackbar
          open={openSnack}
          autoHideDuration={4500}
          onClose={() => {
            setOpenSnack(false);
            dispatch(clearMaterialMovementError());
          }}
        >
          <Alert severity={snackSeverity} sx={{ width: "100%" }}>
            {snackMsg}
          </Alert>
        </Snackbar>
      )}
    </Box>
  );
}