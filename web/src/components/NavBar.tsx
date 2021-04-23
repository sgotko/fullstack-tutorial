import { Box, Button, Flex, Heading, Link } from "@chakra-ui/react";
import NextLink from "next/link";
import React from "react";
import { useLogoutMutation, useMeQuery } from "../generated/graphql";

interface NavBarProps {}

const NavBar: React.FC<NavBarProps> = ({}) => {
  const [{ data, fetching }] = useMeQuery();
  const [{ fetching: logoutFetching }, logout] = useLogoutMutation();
  let body = null;

  // data is loading
  if (fetching) body = null;
  else if (!data?.me)
    body = (
      <>
        <NextLink href="/login">
          <Link color="white" mr={2}>
            login
          </Link>
        </NextLink>

        <NextLink href="/register">
          <Link color="white">register</Link>
        </NextLink>
      </>
    );
  else
    body = (
      <Flex>
        <Box mr={2}>{data?.me?.username}</Box>
        <Button
          variant="link"
          onClick={() => {
            logout();
          }}
          isLoading={logoutFetching}
        >
          logout
        </Button>
      </Flex>
    );
  return (
    <Flex position="sticky" zIndex={1} top={0} bg="tan" p={4} align="center">
      <NextLink href="/">
        <Link>
          <Heading size="sm">fullstack-tutorial</Heading>
        </Link>
      </NextLink>
      <Box ml={"auto"}>{body}</Box>
    </Flex>
  );
};

export default NavBar;
