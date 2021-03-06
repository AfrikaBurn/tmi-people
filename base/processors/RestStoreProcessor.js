/**
 * @file RestStoreProcessor.js
 * Basic RESTful processor for basic HTTP methods with persistance.
 */
"use strict"


const
  RestProcessor = require('./RestProcessor')


class RestStoreProcessor extends RestProcessor {

  /**
   * Process a GET request from storage.
   * @inheritDoc
   */
  get(req, res) {
    return req.header('Content-Type') == 'application/json;schema'
      ? { status: 200, data: this.endpoint.schema }
      : this.endpoint.store.read(req.user, req.query)
  }

  /**
   * Process a POST request and persists to store storage.
   * @inheritDoc
   */
  post(req, res) {
    return this.endpoint.store.create(req.user, req.body)
  }

  /**
   * Process a PUT request and persists to store storage.
   * @inheritDoc
   */
  put(req, res) {
    return this.endpoint.store.write(req.user, req.query, req.body)
  }

  /**
   * Process a PATCH request and persists to store storage.
   * @inheritDoc
   */
  patch(req, res) {
    return this.endpoint.store.update(req.user, req.query, req.body)
  }

  /**
   * Process a DELETE request and persists to store storage.
   * @inheritDoc
   */
  delete(req, res) {
    return this.endpoint.store.delete(req.user, req.query)
  }
}


module.exports = RestStoreProcessor