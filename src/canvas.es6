import Blobs from './canvas/blobs.es6';
import FilterChain from './canvas/filterchain.es6';
import Filters from './canvas/filters.es6';

exports.image = {
    canvas: {
        blobs: Blobs,
        filterchain: FilterChain,
        filters: Filters
    }
};