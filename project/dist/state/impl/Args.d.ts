export declare class OptionArgs {
    readonly options: any;
    readonly key: string;
    private _variableArgs?;
    private constructor();
    get variableArgs(): VariableArgs | undefined;
    static of(options: any): OptionArgs | undefined;
}
export declare class VariableArgs {
    readonly variables: any;
    readonly key: string;
    private constructor();
    constains(args: VariableArgs): boolean;
    static of(variables: any): VariableArgs | undefined;
    static contains(left: VariableArgs | undefined, right: VariableArgs | undefined): boolean;
    static fieldKey(fieldName: string, args?: VariableArgs): string;
}
