import { ApolloClient } from 'apollo-client';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { onError } from 'apollo-link-error';
import { ApolloLink } from 'apollo-link';
import { setContext } from 'apollo-link-context';
import { createUploadLink } from 'apollo-upload-client';
import { createNetworkStatusNotifier } from 'react-apollo-network-status';
import { JWT_STORAGE_KEY } from '@/constants';

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem(JWT_STORAGE_KEY);
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

const {
  link: networkStatusNotifierLink,
  useApolloNetworkStatus,
} = createNetworkStatusNotifier();

const client = new ApolloClient({
  link: ApolloLink.from([
    networkStatusNotifierLink,
    authLink,
    onError(({ graphQLErrors, networkError }) => {
      if (graphQLErrors)
        graphQLErrors.forEach(({ message, path }) =>
          console.error(`[GraphQL error]: Message: ${message}, Path: ${path}`),
        );

      if (networkError) console.error(`[Network error]: ${networkError}`);

      if (graphQLErrors && graphQLErrors[0]) {
        const errors = graphQLErrors[0];
        switch (errors.extensions.code) {
          case 'UNAUTHENTICATED':
            if (!window.location.pathname.startsWith('/auth')) {
              localStorage.removeItem(JWT_STORAGE_KEY);
              window.location.href = '/auth/signin';
            }
            break;
          case 'ANOTHER_ERROR_CODE':
            break;
          default:
        }
      }
    }),
    createUploadLink({
      uri: process.env.REACT_APP_GRAPHQL_URL,
      credentials: 'include',
    }),
  ]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'no-cache',
    },
    query: {
      fetchPolicy: 'no-cache',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
});

export { client, useApolloNetworkStatus };
