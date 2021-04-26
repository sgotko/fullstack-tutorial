import { Heading, Text } from "@chakra-ui/layout";
import { Box } from "@chakra-ui/react";
import { withUrqlClient } from "next-urql";
import React from "react";
import { EditDeletePostButtons } from "../../components/EditDeletePostButtons";
import { Layout } from "../../components/Layout";
import { createUrqlClient } from "../../utils/createUrqlClient";
import { useGetPostFromUrl } from "../../utils/useGetPostFromUrl";
import { withApollo } from "../../utils/withApollo";

const Post: React.FC<{}> = ({}) => {
  const { data, loading } = useGetPostFromUrl();
  if (loading)
    return (
      <Layout>
        <div>loading post...</div>
      </Layout>
    );

  if (!data?.post) {
    return (
      <Layout>
        <Box>could not find post</Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Heading mv={4}>{data.post.title}</Heading>
      <Text mv={4}>{data.post.text}</Text>

      <EditDeletePostButtons
        id={data.post.id}
        creatorId={data.post.creator.id}
      />
    </Layout>
  );
};

export default withApollo({ ssr: true })(Post);
