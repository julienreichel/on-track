/**
 * @type {import('aws-amplify/data').Client<import('../amplify/data/resource').Schema>}
 */

export type Locale = "en" | "fr";

export type GraphQLModel = {
  id?: string;
  [key: string]: string | object | number | undefined; // Allow other properties
}

export type GraphQLOptions = {
  [key: string]: string | object | number | undefined; // Define specific options if needed
}

export type GraphQLParams = {
  filter?: string;
  limit?: number;
  nextToken?: string;
  sortDirection?: string;
  [key: string]: string | object | number | undefined; // Define specific options if needed
}

export default function (
  model: string,
  selectionSet?: string[],
  listSelectionSet?: string[]
) {
  const defaultOptions = {
    authMode: "userPool",
    selectionSet,
  };
  const provider = useNuxtApp().$Amplify.GraphQL.client.models[model];

  /**
   * Call the GraphQL API
   * @param {string} request - The type of request to perform (e.g., 'create', 'update', 'delete', 'get', 'list').
   * @param {GraphQLModel} input - The model data to be sent with the request.
   * @param {GraphQLOptions} options - Additional options for the request, such as authentication mode and selection set.
   * @returns {Promise<GraphQLModel>} - A promise that resolves to the response data, which always includes an `id` property.
   */
  const call = async (
    request: string,
    input: GraphQLModel | GraphQLParams,
    options: GraphQLOptions = {}
  ): Promise<GraphQLModel> => {
    options = {
      ...defaultOptions,
      ...options,
    };
    console.log("useGraphqlQuery", request, input, options);
    if (request === "list") {
      input = {
        ...options,
        ...input
      }
    }
    const { data } = await provider[request](input, options);
    return data;
  };

  /**
   * Create a model
   *
   * @param {GraphQLModel} input the model data
   * @param {GraphQLOptions} options the options
   * @returns {Promise<GraphQLModel>}
   */
  const create = async (input: GraphQLModel, options: GraphQLOptions = {}) => {
    return call("create", input, options);
  };

  /**
   * Update a model
   *
   * @param {GraphQLModel} input the model data
   * @param {GraphQLOptions} options the options
   * @returns {Promise<GraphQLModel>}
   */
  const update = async (input: GraphQLModel, options: GraphQLOptions = {}) => {
    return call("update", input, options);
  };

  /**
   * Get a model
   *
   * @param {string} id the model id
   * @param {GraphQLOptions} options the options
   * @returns {Promise<GraphQLModel>}
   */
  const get = async (id: string, options: GraphQLOptions = {}) => {
    return call("get", { id }, options);
  };

  /**
   * Delete a model
   *
   * @param {GraphQLModel} model the model
   * @param {GraphQLOptions} options the options
   * @returns {Promise<GraphQLModel>}
   */
  const del = async (model: GraphQLModel, options: GraphQLOptions = {}) => {

    const data = await call("delete", model, options);

    return data;
  };

  /**
   * List models
   *
   * @param {GraphQLParams} params options
   * @param {string} [params.filter] filter
   * @param {number} [params.limit] limit
   * @param {string} [params.nextToken] nextToken
   * @param {string} [params.sortDirection] sortDirection
   * @param {GraphQLOptions} options the options
   * @returns {Promise<GraphQLModel[]>}
   */
  const list = async (params: GraphQLParams = {}, options: GraphQLOptions = {}) : Promise<GraphQLModel[]> => {
    options = {
      selectionSet: listSelectionSet,
      ...options,
    };
    return call("list", params, options) as unknown as GraphQLModel[];
  };

  const pick = (obj: GraphQLParams, keys: string[]) => {
    return keys.reduce((acc, key) => {
      if (key in obj) {
        acc[key] = obj[key];
      }
      return acc;
    }, {} as GraphQLParams);
  }

  return {
    call,
    create,
    update,
    get,
    delete: del,
    list,
    pick
  };
}
