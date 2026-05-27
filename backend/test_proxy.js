const rows = [{ id: 1, providerid: 2, providername: 'Test' }];

const proxiedRows = rows.map(row => {
    return new Proxy(row, {
        get(target, prop) {
            if (typeof prop === 'string') {
                const lowerProp = prop.toLowerCase();
                if (lowerProp in target) {
                    return target[lowerProp];
                }
            }
            return Reflect.get(target, prop);
        }
    });
});

const s = proxiedRows[0];
console.log(s.Id);
console.log(s.ProviderId);
console.log(s.ProviderName);
