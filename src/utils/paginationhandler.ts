
import { Model } from 'mongoose';

export interface IPaginationInfo {
    page?: number;
    limit?: any;
    total?: number;
}

export async function getPagedAndFilteredData<T>(
    model: Model<T>,
    filter: object,
    paginationInfo: IPaginationInfo,
): Promise<{ items: T[]; paginationInfo: IPaginationInfo }> {
    const { page, limit } = paginationInfo;
    const skip = (page! - 1) * limit!;
    const items = await model.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 });

    return {
        items,
        paginationInfo: {
            ...paginationInfo,
            total: await model.countDocuments(filter),
        },
    };
}
