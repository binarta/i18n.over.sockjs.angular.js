angular.module('binarta.sockjs', [])
    .factory('sockJS', [SockJSFactory]);

function SockJSFactory() {
    var callback;
    return {
        callback: function() {return callback},
        send: function(data) {
            this.data = data;
            return {
                then: function(cb) {
                    callback = cb;
                }
            }
        }
    }
}

describe('i18n.sockjs.js', function() {
    var topicRegistryMock;
    var topicMessageDispatcher;
    var config;

    beforeEach(module('rest.client'));
    beforeEach(module('i18n.over.sockjs'));
    beforeEach(module('notifications'));

    beforeEach(inject(function(_topicRegistryMock_, _topicMessageDispatcher_, _config_) {
        topicRegistryMock = _topicRegistryMock_;
        topicMessageDispatcher = _topicMessageDispatcher_;
        config = _config_;
    }));

    describe('iosMessageReader', function() {
        var reader;
        var sockJS;
        var translation;
        var status;
        var onSuccess = function(msg) {
            translation = msg;
            status = 'ok'
        };
        var onError = function() {
            status = 'error';
        };

        beforeEach(inject(function(_iosMessageReader_, _sockJS_) {
            reader = _iosMessageReader_;
            sockJS = _sockJS_;
            reader({namespace:'N', locale:'L', code:'C'}, onSuccess, onError);
        }));

        afterEach(function() {
            status = undefined;
            translation = undefined;
        });

        it('send a message over sockjs', function() {
            expect(sockJS.data).toEqual({
                topic:'i18n.translate',
                responseAddress: 'i18n.translated.1',
                payload: {
                    namespace:'N',
                    locale:'L',
                    key:'C'
                }
            });
        });

        it('when response is ok', function() {
            sockJS.callback()({subject:'ok', payload:{msg:'M'}});
            expect(status).toEqual('ok');
            expect(translation).toEqual('M');
        });

        it('when response is error', function() {
            sockJS.callback()({subject:'error'});
            expect(status).toEqual('error');
            expect(translation).toBeUndefined();
        });
    });

    describe('writer', function () {
        var writer;
        var code = 'translation.code';
        var translation = 'translation message';
        var namespace = 'namespace';
        var locale = 'locale';
        var receivedSuccess;
        var receivedError;
        var receivedStatus;
        var receivedBody;
        var onSuccess = function () {
            receivedSuccess = true;
        };
        var onError = function (body, status) {
            receivedError = true;
            receivedStatus = status;
            receivedBody = body;
        };
        var context;
        var rest;
        var presenter;

        beforeEach(inject(function (iosMessageWriter, restServiceHandler) {
            rest = restServiceHandler;
            writer = iosMessageWriter;
            receivedSuccess = false;
            receivedError = false;
            context = {};
            presenter = {
                success:onSuccess
            }
        }));

        function expectRestCallFor(ctx) {
            expect(rest.calls.first().args[0].params).toEqual(ctx);
        }

        describe('given required context fields', function() {
            beforeEach(function() {
                context.key = code;
                context.message = translation;
            });

            describe('on execute', function() {
                beforeEach(function() {
                    writer(context, presenter);
                });

                it('performs rest call', function() {
                    expectRestCallFor({
                        method:'POST',
                        url:'api/i18n/translate',
                        data:{locale: undefined, key: code, message: translation},
                        withCredentials:true
                    });
                });
            });

            describe('and optional context fields', function() {
                beforeEach(function() {
                    context.namespace = namespace;
                    context.locale = locale;
                });

                describe('on execute', function() {
                    beforeEach(function() {
                        writer(context, presenter);
                    });

                    it('performs rest call', function() {
                        expectRestCallFor({
                            method:'POST',
                            url:'api/i18n/translate',
                            data:{key: code, message: translation, namespace:namespace, locale: locale},
                            withCredentials:true,
                            headers: {
                                'accept-language': locale
                            }
                        });
                    });
                });
            });
        });

        function testHttpCallsWithPrefix(prefix) {
            it('on execute', function () {
                context.key = code;
                context.message = translation;
                writer(context, {
                    success:onSuccess,
                    error:onError
                });
                expectRestCallFor({
                    method:'POST',
                    url:prefix + 'api/i18n/translate',
                    data:{locale: undefined, key: code, message: translation},
                    withCredentials:true
                });
            });
        }

        testHttpCallsWithPrefix('');
        describe('with baseuri', function () {
            beforeEach(function () {
                config.baseUri = 'http://host/context/';
            });

            testHttpCallsWithPrefix('http://host/context/');
        });

        describe('without baseUri', function () {
            testHttpCallsWithPrefix('');
        });
    })
});