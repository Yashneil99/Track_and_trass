exports.cleanAttributes = (attributes = []) =>
  (attributes || []).filter(
    (a) => a.key?.trim() !== "" || a.value?.trim() !== "",
  );

exports.groupLocationsByName = (data) => {
  const grouped = {};

  data.forEach((loc) => {
    const name = loc.name;
    const isChild = /\d/.test(name);

    if (isChild) {
      const parentName = name.replace(/\s*\d.*/, "").trim();
      if (!grouped[parentName]) {
        grouped[parentName] = { parent: null, children: [] };
      }
      grouped[parentName].children.push(loc);
    } else {
      if (!grouped[name]) {
        grouped[name] = { parent: null, children: [] };
      }
      grouped[name].parent = loc;
    }
  });
  return Object.values(grouped);
};

exports.buildLocationTree = (flatList) => {
  const map = new Map();
  const roots = [];

  // Step 1: Initialize map entries
  flatList.forEach((item) => {
    map.set(item.code, { ...item, children: [] });
  });

  // Step 2: Assign children to parents
  flatList.forEach((item) => {
    const node = map.get(item.code);

    if (item.parent_id) {
      const parent = map.get(item.parent_id);
      if (parent) {
        parent.children.push(node);
      }
    } else {
      roots.push(node); // root node
    }
  });

  return roots;
};

exports.groupByLocation = (rows) => {
  const map = {};

  rows.forEach(row => {
    if (!map[row.code]) {
      map[row.code] = {
        location_id : row.location_id,
        code: row.code,
        name: row.name,
        type: row.type,
        stack: row.stack,
        attributes: row.attributes,
        parent_id: row.parent_id,
        materials: []
      };
    }

    // Only add material if it exists
    if (row.material_code) {
      map[row.code].materials.push({
        material_code: row.material_code,
        material_name: row.material_name,
        quantity: row.quantity,
        status: row.status,
        latest_moved_at: row.latest_moved_at,
        previous_location: row.previous_location
      });
    }
  });

  return Object.values(map);
};