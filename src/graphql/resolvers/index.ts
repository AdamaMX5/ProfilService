import { globalProfileResolvers } from './globalProfile.js'
import { virtualOfficeProfileResolvers } from './virtualOfficeProfile.js'
import { freeSchoolProfileResolvers } from './freeSchoolProfile.js'
import { genericProfileResolvers } from './genericProfile.js'

export const resolvers = {
  JSON: genericProfileResolvers.JSON,
  Query: {
    ...globalProfileResolvers.Query,
    ...virtualOfficeProfileResolvers.Query,
    ...freeSchoolProfileResolvers.Query,
    ...genericProfileResolvers.Query,
  },
  Mutation: {
    ...globalProfileResolvers.Mutation,
    ...virtualOfficeProfileResolvers.Mutation,
    ...freeSchoolProfileResolvers.Mutation,
    ...genericProfileResolvers.Mutation,
  },
}
