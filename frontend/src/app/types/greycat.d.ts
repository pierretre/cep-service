// GreyCat type declarations
declare global {
    const gc: {
        sdk: {
            init(config: { timezone: string }): Promise<any>;
        };
        core: {
            TimeZone: { [key: string]: any };
        };
    };
}

export { };
