/**
 * @file Store.js
 * Basic Data Store.
 */
"use strict"


const
  Ajv = require('ajv')


class Store {


  /* ----- Construction ----- */


  /**
   * Creates a new data store.
   * @param  {object} config endpoint configuration.
   */
  constructor(name, config, schema){
    this.name = name
    this.config = config
    this.schema = schema
  }


  // ----- Store Setup -----


  /**
   * Performs installation tasks.
   */
  install(){}


  // ----- Store Cleanup -----


  /**
   * Closes the data store.
   * @return {boolean}  True if close is successfull, false if not.
   */
  close(){
    return true;
  }


  // ----- Storage -----


  /**
   * Create entities.
   * @param  {object}   user      User creating the entities.
   * @param  {array}    entities  Array of data entities to create.
   * @param  {boolean}  validated boolean indicating whether the entities have
   *                              been validated or not. Defaults to false.
   * @return {array} Data         Array of entities that were created
   *                              successfully.
   */
  create(user, entities, validated = false){
    if (!validated) this.validate(entities)
    return utility.response(Store.CREATED, entities)
  }

  /**
   * Read entities matching the provided criteria.
   * @param  {object} user      User reading the entities.
   * @param  {object} criteria  Partial entity to match.
   * @param  {object} fields    an optional array of field names to
   *                            fetch.
   * @return {array} Array of matching entities.
   */
  read(user, criteria, fields){
    var entities = criteria
    return utility.response(Store.SUCCESS, entities)
  }

  /**
   * Persist entities.
   * @param  {object} user        User updating the entities.
   * @param  {object} criteria    Partial entity to match.
   * @param  {array}  entities    Entities to persist.
   * @param  {boolean}  validated boolean indicating whether the entities have
   *                              been validated or not. Defaults to false.
   * @return {array}              Array of updated entities
   */
  write(user, criteria, entities, validated = false){
    if (!validated) this.validate(entities)
    return utility.response(Store.SUCCESS, entities)
  }

  /**
   * Update entities matching the provided criteria with the properties from
   * partial.
   * @param  {object}   user      User updating the entities.
   * @param  {object}   criteria  Partial entity to match.
   * @param  {object}   partial   Partial entity to apply update from.
   * @param  {boolean}  validated boolean indicating whether the entities have
   *                              been validated or not. Defaults to false.
   * @return {array}              Array of updated entities
   */
  update(user, criteria, partial, validated = false){
    if (!validated) this.validatePartial(entities)
    return utility.response(Store.SUCCESS, entities)
  }

  /**
   * Delete all entities matching the provided criteria.
   * @param  {object} user      User deleting the entities.
   * @param  {object} criteria  Partial entity to match.
   * @return {array}            Array of deleted entities
   */
  delete(user, criteria){
    var entities = criteria
    return utility.response(Store.SUCCESS, entities)
  }


  // ----- Validation -----


  /**
   * Validate an array of entities against the store schema.
   * @param {array} entities
   */
  validate(entities){

    if (!Array.isArray(entities)) throw utility.error(
      Store.INVALID,
      ["Array expected"]
    )

    var errors = []

    entities.forEach(
      (entity, index) => {
        if (
          !Store.VALIDATOR.validate(
            this.name,
            entity
          )
        ) errors[index] = Store.normaliseErrors(Store.VALIDATOR.errors)
      }
    )

    if (errors.length) throw utility.error(Store.INVALID, errors)
  }

  /**
   * Validate an array of partial entities against the store schema.
   * @param {array} partials
   */
  validatePartial(partials){

    if (!Array.isArray(partials)) throw utility.error(
      Store.INVALID,
      ["Array expected"]
    )

    var errors = []

    function validateFields(schema, partial, index){

      if (schema.allOf) {
        schema.properties = schema.properties || {}
        schema.allOf.forEach(
          (id) => Object.assign(
            schema.properties,
            Store.VALIDATOR.getSchema(id['$ref']).schema.properties
          )
        )
      }

      if (typeof partial == 'object'){
        Object.keys(partial).forEach(
          (property) => {
            if (property.type == 'object')
              validateFields(schema[property], partial[property], index)
            else if (
              !Store.VALIDATOR.validate(
                schema.properties[property],
                partial[property]
              )
            ) errors[index] = Store.normaliseErrors(Store.VALIDATOR.errors)
          }
        )
      }
    }

    partials.forEach(
      (entity, index) => validateFields(utility.clone(this.schema), entity, index)
    )

    if (errors.length) throw utility.error(Store.INVALID, errors)
  }


  // ----- Compatibility -----


  /**
   * Returns a passport compatible session store version of this store.
   * @return {object}
   */
  toSessionStore(){
    utility.log(
      '\x1b[33mWARNING: Using memory based store for session storage!\n' +
      '\x1b[33mIt will fail with multiple connections!\n' +
      '\x1b[33mUse another store for production.\x1b[0m',
      {indent: 4, verbose: false, once: true}
    );
    return undefined;
  }
}


// ----- Statuses -----


Store.SUCCESS = {status: 'Success', status: 200, expose: true}
Store.CREATED = {status: 'Entities created', status: 201, expose: true}
Store.INVALID = {error: 'Failed validation', status: 422, expose: true}
Store.NOT_FOUND = {status: 'Entity not found', status: 404, expose: true}


// ----- Shared Validation -----


Store.VALIDATOR = new Ajv(
  {
    coerceTypes: true,
    allErrors: true,
    jsonPointers: true,
    useDefaults: true
  }
)


// ----- Validation error messages -----


require('ajv-errors')(Store.VALIDATOR);

/**
* Normalise error messages returned by the validator.
 * @param {array} errors
 */
Store.normaliseErrors = (errors) => {
  return [{}].concat(errors).reduce(

    (cache, next) => {

      var
        field = next.dataPath.length
          ? next.dataPath.replace(/^\./, '')
          : next.params.missingProperty,
        error = {
          violation: next.keyword,
          message: next.message
        }

      cache[field] !== undefined
        ? cache[field].push(error)
        : cache[field] = [error]

      return cache
    }
  )
}


// ----- Utility -----


/**
 * Computes a diff between two entities
 * @param {object} e1 first Entity to compare
 * @param {object} e2 second Entity to compare
 */
Store.DIFF = (e1, e2) => {

  var diff = {}

  function propDiff(p1, p2, name = '', prefix = ''){

    if (typeof p1 == 'object' && typeof p2 == 'object'){

      var
        p1Keys = p1 instanceof Array
          ? p1.keys()
          : Object.keys(p1),
        p2Keys = p2 instanceof Array
          ? p2.keys()
          : Object.keys(p2),
        keys = [...new Set(p1Keys.concat(p2Keys))]

      keys.forEach(
        (key) => propDiff(
          p1[key],
          p2[key],
          key,
          [prefix, name].filter((s)=>s!='').join('.')
        )
      )

      return
    }

    if (p1 != p2){
      diff[[prefix, name].filter((s)=>s!='').join('.')] = {
        from: p1,
        to: p2
      }
      return
    }
  }

  propDiff(e1, e2)

  return diff
}


module.exports = Store