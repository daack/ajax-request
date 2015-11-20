var Ajax = (function () {
	function Ajax() {
		/**
		 * The processing request key
		 *
		 * @type {String}
		 */
		this.processing_key = null;

		/**
		 * Object initialized
		 *
		 * @type {Boolean}
		 */
		this.is_initied = false;

		/**
		 * Subscribed events
		 *
		 * @type {Object}
		 */
		this.events = {};
	};

	Ajax.prototype = {
		/**
		 * PLUGINS
		 */

		getCrypto: function(callback) {
			if (typeof CryptoJS == 'object') {
				callback();
			} else {
				basket.require({
					url: 'md5.js',
					key: 'md5.js',
				})
				.then(function() {
					callback();
				});
			}
		},
		getLocalForage: function(callback) {
			if (typeof localforage == 'object') {
				callback();
			} else {
				basket.require({
					url: 'localforage.min.js',
					key: 'localforage.js',
				})
				.then(function() {
					callback();
				});
			}
		},

		/**
		 * Initialize Object
		 *
		 * @return {Boolean}
		 */
		init: function() {
			var _this       = this;
			this.is_initied = true;

			this.getLocalForage(function() {
				localforage.config({
					name        : 'name',
					version     : 1.0,
					storeName   : 'store',
				});
			});

			return this.is_initied;
		},
		/**
		 * Check if the request is new or the one
		 * that is processing
		 *
		 * @param  {String}  key
		 * @return {Boolean}
		 */
		isNewRequest: function(key) {
			if (this.processing_key == key) {
				return false;
			}
			this.processing_key = key;
			return true;
		},
		/**
		 * Make new key for the request
		 *
		 * @param  {Object}   params   JQuery ajax parameters
		 * @param  {Function} callback
		 */
		makeKey: function(params, callback) {
			this.getCrypto(function() {
				params_to_hash = _.reject(params, function(value, key){ return (key == 'success' || key == 'error') });
				var key        = CryptoJS.MD5(JSON.stringify(params_to_hash)).toString();

				callback(key, params);
			});
		},
		/**
		 * Check if the data get from localstorage is still valid
		 *
		 * @param  {Object} params          JQuery ajax parameters
		 * @param  {Mixed}  processing_data
		 */
		checkValidityOfData: function(params, processing_data) {
			var _this      = this;
			var key        = params.key;
			params.success = null;
			params.error   = null;

			this.makeAjaxRequest(null, params, function(data) {
				var data_type  = typeof data;
				var prcs_type  = typeof processing_data;
				var store_data = function(params, data) {
					_this.getLocalForage(function() {
						localforage.clear();
						localforage.setItem(key, data);
					});
				};

				if (data_type != prcs_type) {
					store_data(params, data);
					return;
				}

				if (data_type == 'object' && !_.isEqual(processing_data, data)) {
					store_data(params, data);
					return;
				}

				if (data_type == 'string' && processing_data.localeCompare(data) != 0) {
					store_data(params, data);
					return;
				}
			});
		},
		/**
		 * Function to execute after request
		 *
		 * @param  {Object}  params
		 * @param  {Mixed}   data
		 * @param  {Boolean} validity
		 */
		afterRequest: function(params, data, validity) {
			this.processing_key = null;

			if (validity) this.checkValidityOfData(params, data);
		},
		/**
		 * Create JQuery Ajax request
		 *
		 * @param  {String}   key
		 * @param  {Object}   params
		 * @param  {Function} callback
		 */
		makeAjaxRequest: function(key, params, callback) {
			var _this = this;

			$.ajax(params)
			.done(function(data) {
				if (callback) {
					callback(data);
					return;
				}

				_this.getLocalForage(function() {
					localforage.setItem(key, data);
				});
			})
			.fail(function(err) {
				_this.trigger('ajax-error', err);
			})
			.always(function() {
				params.key = key;
				_this.afterRequest(params);
			});
		},
		/**
		 * Request
		 *
		 * @param  {Object} params JQuery ajax parameters
		 */
		request: function(params) {
			if (!this.is_initied) this.init();

			var _this        = this;
			var send_request = function(key, params) {
				var callback = params.success;

				if (!_this.isNewRequest(key)) return;

				_this.getLocalForage(function() {
					try {
						localforage.getItem(key, function(err, data){
							if (!(err || !data)) {
								callback(data);
								params.key = key;
								_this.afterRequest(params, data, true);
							} else {
								_this.makeAjaxRequest(key, params);
							}
						});
					} catch(err) {
						console.warn('Ajax Error: ' + err.message);
						location.reload();
					}
				});
			};

			this.makeKey(params, send_request);
		},

		/**
		 * EVENTS
		 */
		on: function(event, callback) {
			if (!this.events[event]) {
				this.events[event] = [];
			}
			this.events[event].push(callback);
		},
		trigger: function(event, data) {
			var subscribers = this.events[event];
			if (subscribers) {
				_.each(subscribers, function(callback) {
					callback(data);
				});
			}
		},
	};

	return new Ajax();
})();