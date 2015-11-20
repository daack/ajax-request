# ajax-request

Ajax is a JavaScript Object that use JQuery Ajax with [mozilla/localForage](https://github.com/mozilla/localForage). In order to store the data requested by ajax.

```javascript
Ajax.request({
  method: 'POST',
  data: {foo: 'bar'},
  success: function(response) {
  },
  error: function(err) {
  },
});
```
