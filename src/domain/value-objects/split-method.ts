export type SplitMethodType = 'EQUAL' | 'FIXED' | 'PERCENTAGE'

const VALID_METHODS: SplitMethodType[] = ['EQUAL', 'FIXED', 'PERCENTAGE']

export class SplitMethod {
    static readonly EQUAL: SplitMethodType = 'EQUAL'
    static readonly FIXED: SplitMethodType = 'FIXED'
    static readonly PERCENTAGE: SplitMethodType = 'PERCENTAGE'

    static isValid(value: string): value is SplitMethodType {
        return VALID_METHODS.includes(value as SplitMethodType)
    }
}