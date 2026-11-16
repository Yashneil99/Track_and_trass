const { log } = require("winston");
const {addNewProcess, getAllProcess,updateProcesses}=require("../dataLayer/processDL")

const addProcess = async (req, res) => {
  try {
    
    const requiredFields = [
      'name',
      'description',
      'input_material_types',
      'output_material_types',
      // 'created_at',
      // 'process_id',
    ];

    const missingFields = requiredFields.filter(field => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Missing required fields: ${missingFields.join(', ')}`,
      });
    }

    const {
      name,
      description,
      input_material_types,
      output_material_types, 
    } = req.body;

    const result = await addNewProcess({
      name,
      description,
      input_material_types,
      output_material_types,  
    });
    return res.status(result.status).json(result);
  } catch (error) {
    console.error("Add New Process Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const fetchAllProcess = async (req, res) => {
  try {
    const result = await getAllProcess();
    return res.status(result.status).json(result);
  } catch (error) {
    console.error("Fetch All Movements Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const updateProcess = async (req, res) => {
  try {
    const requiredFields = [
      'process_id',
      'name',
      'description',
      'input_material_types',
      'output_material_types',    
    ];

    const missingFields = requiredFields.filter(field => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Missing required fields: ${missingFields.join(', ')}`,
      });
    }

    const {
      process_id,
      name,
      description,
      input_material_types,
      output_material_types,   
    } = req.body;

    const result = await updateProcesses ({
      process_id,
      name,
      description,
      input_material_types,
      output_material_types,     
    });

    return res.status(result.status).json(result);
  } catch (error) {
    console.error("Update Process Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports={
addProcess,
fetchAllProcess,updateProcess
}