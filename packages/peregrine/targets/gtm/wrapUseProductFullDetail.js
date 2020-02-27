export default function usePFDWrapped(orig) {
    return function useProductFullDetail(props) {
        const api = orig(props);
        return {
            ...api,
            handleAddToCart(...args) {
                console.log(
                    `%cProduct %c%s %cadded to cart!`,
                    'font-weight: bold; font-size: large',
                    'font-weight: bold; color: red; font-size: large',
                    api.productDetails.sku,
                    'font-weight: bold; font-size: large'
                );
                return api.handleAddToCart(...args);
            }
        };
    };
}
