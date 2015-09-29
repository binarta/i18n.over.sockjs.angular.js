(function() {
    angular.module('i18n.over.sockjs', ['binarta.sockjs', 'config', 'rest.client', 'notifications'])
        .factory('iosMessageReader', ['sockJS', I18nMessageReaderFactory])
        .factory('iosMessageWriter', ['config', 'restServiceHandler', I18nMessageWriterFactory]);

    function I18nMessageReaderFactory(sockJS) {
        var counter = 0;
        return function(ctx, onSuccess, onError) {
            var handlers = {
                ok: function(data) {
                    onSuccess(data.payload.msg)
                }
            };
            sockJS.send({
                topic:'i18n.translate',
                responseAddress:'i18n.translated.'+(++counter),
                payload:{namespace:ctx.namespace, locale:ctx.locale, key:ctx.code}
            }).then(function(data) {
                var handler = handlers[data.subject] || onError;
                handler(data);
            })
        }
    }

    function I18nMessageWriterFactory(config, restServiceHandler) {
        return function (ctx, presenter) {
            var payload = {
                locale: ctx.locale,
                key: ctx.key,
                message: ctx.message
            };
            if (ctx.namespace) payload.namespace = ctx.namespace;

            presenter.params = {
                method: 'POST',
                url: (config.baseUri || '') + 'api/i18n/translate',
                data: payload,
                withCredentials: true
            };
            if (ctx.locale) presenter.params.headers = {'accept-language': ctx.locale};
            restServiceHandler(presenter);
        }
    }
})();