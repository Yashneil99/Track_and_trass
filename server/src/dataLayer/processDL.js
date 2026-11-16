const con = require("../config/databaseCon");

const addNewProcess = async (processData) => {
  
    const {
        name,
        description,
        input_material_types,
        output_material_types,     
    } = processData;

    const query = `
    INSERT INTO public.process_definitions (
      name, description, input_material_types, output_material_types
    ) VALUES ($1, $2, $3, $4)
    RETURNING *;
  `;

    const values = [
        name,
        description,
        input_material_types,
        output_material_types,      
    ];

    try {
        const result = await con.query(query, values);
        return {
            status: 201,
            message: "New process added successfully",
            data: result.rows[0],
        };
    } catch (error) {
        console.error("Error inserting new process:", error);
        return {
            status: 500,
            message: "Internal server error",
            error: error.message,
        };
    }
};

const getAllProcess = async () => {
  try {
    const query = `
      SELECT 
       *
      FROM public.process_definitions
      ORDER BY created_at DESC;
    `;

    const result = await con.query(query);
    return {
      status: 200,
      data: result.rows,
    };
  } catch (error) {
    console.error("Error Fetching Process:", error);
    return { status: 500, message: "Internal server error" };
  }
};

const updateProcesses  = async (processData) => {
    const {
        process_id, // required to identify which row to update
        name,
        description,
        input_material_types,
        output_material_types,       
    } = processData;

    const query = `
    UPDATE public.process_definitions
    SET 
      name = $1,
      description = $2,
      input_material_types = $3,
      output_material_types = $4    
    WHERE process_id = $5
    RETURNING *;
  `;

    const values = [
        name,
        description,
        input_material_types,
        output_material_types,  
        process_id,
    ];

    try {
        const result = await con.query(query, values);

        if (result.rows.length === 0) {
            return {
                status: 404,
                message: "Process not found",
            };
        }     

        return {
            status: 200,
            message: "Process updated successfully",
            data: result.rows[0],
        };
    } catch (error) {
        console.error("Error updating process:", error);
        return {
            status: 500,
            message: "Internal server error",
            error: error.message,
        };
    }
};

module.exports = {
    addNewProcess,
    getAllProcess,
    updateProcesses 
}