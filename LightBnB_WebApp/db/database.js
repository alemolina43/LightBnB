const properties = require("./json/properties.json");
const users = require("./json/users.json");
const { Pool } = require("pg");

const pool = new Pool({
  user: "development",
  password: "development",
  host: "localhost",
  database: "lightbnb",
});

// pool.query(`SELECT title FROM properties LIMIT 10;`).then(response => {
//   console.log(response);
// });
/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function(email) {
  const queryString =
  `SELECT * 
   FROM users
   WHERE email = $1;
  `;
  const queryArgs = [email.toLowerCase()];

  return pool
    .query(queryString, queryArgs)
    .then((result) => result.rows.length > 0 ?
      result.rows[0] : null)
    .catch((err) => {
      console.log(err.message);
    });
};

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function(id) {
  const queryString =
  `SELECT * 
   FROM users
   WHERE id = $1;
  `;
  const queryArgs = [id];

  return pool
    .query(queryString, queryArgs)
    .then((result) => result.rows.length > 0 ?
      result.rows[0] : null)
    .catch((err) => {
      console.log(err.message);
    });
};

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function(userObj) {
  const queryString = `
      INSERT INTO
        users (name, email, password)
      VALUES
        ($1, $2, $3)
      RETURNING *
    `;
  
  const queryArgs = [userObj.name, userObj.email, userObj.password];
  
  return pool
    .query(queryString, queryArgs)
    .then((result) => result.rows[0])
    .catch((err) => {
      console.log(err.message);
    });
};

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function(guest_id, limit = 10) {
  const queryString = `
      SELECT properties.*, reservations.start_date, reservations.end_date, avg(rating) as average_rating
      FROM reservations
      JOIN properties ON reservations.property_id = properties.id
      JOIN property_reviews ON properties.id = property_reviews.property_id
      WHERE reservations.guest_id = $1
      AND reservations.end_date < now()::date
      GROUP BY properties.id, reservations.id
      ORDER BY reservations.start_date
      LIMIT $2;
    `;
  
  const queryArgs = [guest_id, limit];

  return pool
    .query(queryString, queryArgs)
    .then((result) => {
      return result.rows;
    })
    .catch((err) => {
      console.log(err.message);
    });
};

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = (options, limit = 10) => {
  const queryParams = [];

  let queryString = `
  SELECT properties.*, avg(property_reviews.rating) as average_rating
  FROM properties
  JOIN property_reviews ON properties.id = property_id
  WHERE TRUE
  `;

  // filters
  if (options.city) {
    queryParams.push(`%${options.city}%`);
    queryString += ` AND city LIKE $${queryParams.length} `;
  }
   
  if (options.owner_id) {
    queryParams.push(options.owner_id);
    queryString += ` AND owner_id = $${queryParams.length} `;
  }

  if (options.minimum_price_per_night) {
    queryParams.push(options.minimum_price_per_night);
    queryString += ` AND cost_per_night/100 >= $${queryParams.length}`;
  }

  if (options.maximum_price_per_night) {
    queryParams.push(options.maximum_price_per_night);
    queryString += ` AND cost_per_night/100 <= $${queryParams.length}`;
  }

  queryString += `
   GROUP BY properties.id
   `;

  if (options.minimum_rating) {
    queryParams.push(options.minimum_rating);
    queryString += ` HAVING avg(property_reviews.rating) >= $${queryParams.length} `;
  }

  queryParams.push(limit);
  queryString += `
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};
  `;

  console.log(queryString, queryParams);
  return pool.query(queryString, queryParams).then((res) => res.rows);
};

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function(propertyObj) {
  const queryString = `
      INSERT INTO
        properties (owner_id, title, description, thumbnail_photo_url, cover_photo_url, 
        cost_per_night, street, city, province, post_code, country, parking_spaces, 
        number_of_bathrooms, number_of_bedrooms)
      VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;
  
  const queryArgs = [
    propertyObj.owner_id,
    propertyObj.title,
    propertyObj.description,
    propertyObj.thumbnail_photo_url,
    propertyObj.cover_photo_url,
    propertyObj.cost_per_night,
    propertyObj.street,
    propertyObj.city,
    propertyObj.province,
    propertyObj.post_code,
    propertyObj.country,
    propertyObj.parking_spaces,
    propertyObj.number_of_bathrooms,
    propertyObj.number_of_bedrooms
  ];
  
  return pool
    .query(queryString, queryArgs)
    .then((result) => result.rows[0])
    .catch((err) => {
      console.log(err.message);
    });
};

module.exports = {
  getUserWithEmail,
  getUserWithId,
  addUser,
  getAllReservations,
  getAllProperties,
  addProperty,
};
